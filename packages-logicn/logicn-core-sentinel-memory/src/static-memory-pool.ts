// static-memory-pool.ts — deterministic fixed-block pool.
//
// One backing buffer is reserved up front and NEVER grows. It is split into a
// Compute region and a Governance region (by ratio), each carved into
// fixed-size blocks tracked by a per-segment free-list. Allocation pops a run
// of CONTIGUOUS free blocks; there is no compaction and no growth, so timing is
// deterministic and bounded — a hard requirement for mission-critical /
// aerospace execution. `lockFlight()` freezes allocation entirely for the
// duration of a flight phase.

import { SecurityTrap } from "./errors.js";
import { ALIGN_BYTES, MemoryValidator } from "./memory-validator.js";

export type Segment = "compute" | "governance";

export interface Block {
  readonly ptr: number;
  readonly bytes: number;
  readonly segment: Segment;
}

export interface PoolConfig {
  totalBytes: number;
  blockBytes: number;
  /** Fraction of blocks assigned to the compute region. Default 0.75. */
  computeRatio?: number;
  /** Use a SharedArrayBuffer when true, else a plain ArrayBuffer. */
  shared?: boolean;
}

/** A region of the pool: a contiguous run of equal-size blocks. */
interface Region {
  readonly segment: Segment;
  /** Byte offset of the first block in this region. */
  readonly base: number;
  /** Number of blocks in this region. */
  readonly blockCount: number;
  /** Free block indices (region-local), kept sorted ascending. */
  free: number[];
}

export class StaticMemoryPool {
  readonly buffer: ArrayBufferLike;

  private readonly blockBytes: number;
  private readonly totalBlocks: number;
  private readonly compute: Region;
  private readonly governance: Region;
  /** ptr -> number of contiguous blocks handed out at that ptr. */
  private readonly live = new Map<number, { count: number; segment: Segment }>();
  private flightLocked = false;

  constructor(config: PoolConfig) {
    const { totalBytes, blockBytes } = config;
    const computeRatio = config.computeRatio ?? 0.75;

    if (blockBytes <= 0 || blockBytes % ALIGN_BYTES !== 0) {
      throw new SecurityTrap(
        "LSM-CFG-001",
        `blockBytes (${blockBytes}) must be a positive multiple of ${ALIGN_BYTES}`,
      );
    }
    if (totalBytes <= 0 || totalBytes % blockBytes !== 0) {
      throw new SecurityTrap(
        "LSM-CFG-002",
        `totalBytes (${totalBytes}) must be a positive multiple of blockBytes (${blockBytes})`,
      );
    }

    this.buffer = config.shared
      ? new SharedArrayBuffer(totalBytes)
      : new ArrayBuffer(totalBytes);
    this.blockBytes = blockBytes;
    this.totalBlocks = totalBytes / blockBytes;

    const computeBlocks = Math.floor(this.totalBlocks * computeRatio);
    const governanceBlocks = this.totalBlocks - computeBlocks;

    this.compute = {
      segment: "compute",
      base: 0,
      blockCount: computeBlocks,
      free: Array.from({ length: computeBlocks }, (_, i) => i),
    };
    this.governance = {
      segment: "governance",
      base: computeBlocks * blockBytes,
      blockCount: governanceBlocks,
      free: Array.from({ length: governanceBlocks }, (_, i) => i),
    };
  }

  private region(segment: Segment): Region {
    return segment === "compute" ? this.compute : this.governance;
  }

  allocate(bytes: number, segment: Segment = "compute"): Block {
    if (this.flightLocked) {
      throw new SecurityTrap(
        "LSM-FLIGHT-LOCKED",
        "allocation is forbidden during a locked flight phase",
      );
    }
    if (bytes < 0) {
      throw new SecurityTrap("LSM-BOUNDS-001", `cannot allocate ${bytes} bytes`);
    }

    const need = Math.max(1, Math.ceil(bytes / this.blockBytes));
    const region = this.region(segment);
    const startLocal = this.findContiguous(region, need);
    if (startLocal < 0) {
      throw new SecurityTrap(
        "LSM-POOL-EXHAUSTED",
        `no ${need} contiguous free block(s) in the ${segment} segment`,
      );
    }

    // Remove the run from the free-list.
    const taken = new Set<number>();
    for (let i = 0; i < need; i++) taken.add(startLocal + i);
    region.free = region.free.filter((b) => !taken.has(b));

    const ptr = region.base + startLocal * this.blockBytes;
    const capacity = need * this.blockBytes;
    this.live.set(ptr, { count: need, segment });
    return { ptr, bytes: capacity, segment };
  }

  /** Find the start of the first run of `need` contiguous free blocks, or -1. */
  private findContiguous(region: Region, need: number): number {
    if (region.free.length < need) return -1;
    const sorted = region.free; // maintained sorted
    let runStart = sorted[0]!;
    let runLen = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === sorted[i - 1]! + 1) {
        runLen++;
      } else {
        runStart = sorted[i]!;
        runLen = 1;
      }
      if (runLen >= need) return runStart;
    }
    return need <= runLen ? runStart : -1;
  }

  free(ptr: number): void {
    const rec = this.live.get(ptr);
    if (!rec) {
      throw new SecurityTrap("LSM-FREE-001", `unknown pointer ${ptr}`);
    }
    this.live.delete(ptr);
    const region = this.region(rec.segment);
    const startLocal = (ptr - region.base) / this.blockBytes;
    for (let i = 0; i < rec.count; i++) region.free.push(startLocal + i);
    region.free.sort((a, b) => a - b);
  }

  lockFlight(): void {
    this.flightLocked = true;
  }

  isFlightLocked(): boolean {
    return this.flightLocked;
  }

  i32(block: Block): Int32Array {
    MemoryValidator.assertAligned(block.ptr);
    return new Int32Array(this.buffer, block.ptr, block.bytes / 4);
  }

  u8(block: Block): Uint8Array {
    return new Uint8Array(this.buffer, block.ptr, block.bytes);
  }

  get capacityBytes(): number {
    return this.totalBlocks * this.blockBytes;
  }

  get usedBytes(): number {
    let blocks = 0;
    for (const rec of this.live.values()) blocks += rec.count;
    return blocks * this.blockBytes;
  }

  get freeBytes(): number {
    return this.capacityBytes - this.usedBytes;
  }

  segmentOf(ptr: number): Segment {
    if (ptr < 0 || ptr >= this.capacityBytes) {
      throw new SecurityTrap(
        "LSM-BOUNDS-001",
        `pointer ${ptr} is outside the pool [0, ${this.capacityBytes})`,
      );
    }
    return ptr < this.governance.base ? "compute" : "governance";
  }
}
