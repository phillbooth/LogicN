// =============================================================================
// logicn-devtools-intelligence — Workspace Indexer
//
// Walk all .lln files in a directory, parse each, extract IndexedFlow objects,
// and save as workspace.lindex (JSON).
//
// Supports incremental update: files whose mtime hasn't changed are skipped
// and existing IndexedFlow entries are preserved.
// =============================================================================

import { readdir, readFile, stat, writeFile, readFile as readFileAsync } from "node:fs/promises";
import { join, resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import { parseProgram } from "@logicn/core-compiler";
import { extractFlows } from "./extractor.js";
import type { IndexedFlow, WorkspaceIndex } from "./types.js";

const INDEX_FILENAME = "workspace.lindex";
const INDEX_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// File system walk
// ---------------------------------------------------------------------------

async function walkLlnFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function recurse(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and dist
        if (entry.name !== "node_modules" && entry.name !== "dist" && !entry.name.startsWith(".")) {
          await recurse(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith(".lln")) {
        results.push(fullPath);
      }
    }
  }

  await recurse(dir);
  return results;
}

// ---------------------------------------------------------------------------
// Index load / save
// ---------------------------------------------------------------------------

async function loadExistingIndex(indexPath: string): Promise<WorkspaceIndex | null> {
  try {
    const raw = await readFileAsync(indexPath, "utf-8");
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" && parsed !== null &&
      (parsed as WorkspaceIndex).version === INDEX_VERSION
    ) {
      return parsed as WorkspaceIndex;
    }
    return null;
  } catch {
    return null;
  }
}

async function saveIndex(indexPath: string, index: WorkspaceIndex): Promise<void> {
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public: buildIndex
// ---------------------------------------------------------------------------

export interface IndexBuildResult {
  /** Total flows indexed */
  flowCount: number;
  /** Files newly indexed (parsed this run) */
  filesIndexed: number;
  /** Files skipped because mtime unchanged */
  filesSkipped: number;
  /** Path to the .lindex file */
  indexPath: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Build or incrementally update the workspace.lindex file for `workspaceDir`.
 *
 * @param workspaceDir  Directory to walk for .lln files
 * @param indexDir      Where to write workspace.lindex (defaults to workspaceDir)
 */
export async function buildIndex(
  workspaceDir: string,
  indexDir?: string,
): Promise<IndexBuildResult> {
  const t0 = Date.now();
  const absWorkspace = resolve(workspaceDir);
  const absIndexDir  = resolve(indexDir ?? workspaceDir);
  const indexPath    = join(absIndexDir, INDEX_FILENAME);

  // Load existing index for incremental support
  const existing = await loadExistingIndex(indexPath);
  const existingByPath = new Map<string, IndexedFlow[]>();
  const existingFileHashes: Record<string, string> = existing?.fileHashes ?? {};
  if (existing !== null) {
    for (const flow of existing.flows) {
      const arr = existingByPath.get(flow.filePath) ?? [];
      arr.push(flow);
      existingByPath.set(flow.filePath, arr);
    }
  }

  // Walk workspace for .lln files
  const llnFiles = await walkLlnFiles(absWorkspace);

  const allFlows: IndexedFlow[] = [];
  const newFileHashes: Record<string, string> = {};
  let filesIndexed = 0;
  let filesSkipped = 0;

  for (const filePath of llnFiles) {
    // Check mtime for incremental (fast pre-filter)
    let mtime = 0;
    try {
      const st = await stat(filePath);
      mtime = st.mtimeMs;
    } catch {
      // Skip unreadable files
      continue;
    }

    // Read file content for SHA-256 differential check
    let source = "";
    try {
      source = await readFile(filePath, "utf-8");
    } catch {
      continue;
    }

    // Compute SHA-256 of file content
    const contentHash = createHash("sha256").update(source, "utf8").digest("hex");
    newFileHashes[filePath] = contentHash;

    // Skip if content hash matches existing index (content unchanged)
    const existingFlows = existingByPath.get(filePath);
    if (
      existingFlows !== undefined &&
      existingFlows.length > 0 &&
      existingFileHashes[filePath] === contentHash
    ) {
      // File content unchanged — reuse existing indexed flows
      allFlows.push(...existingFlows);
      filesSkipped++;
      continue;
    }

    // Parse and extract
    const parseResult = parseProgram(source, relative(absWorkspace, filePath));
    const flows = extractFlows({ parseResult, filePath, source, sourceMtime: mtime });
    allFlows.push(...flows);
    filesIndexed++;
  }

  const index: WorkspaceIndex = {
    version: INDEX_VERSION,
    builtAt: new Date().toISOString(),
    workspaceDir: absWorkspace,
    flows: allFlows,
    fileHashes: newFileHashes,
    skippedFiles: filesSkipped,
  };

  await saveIndex(indexPath, index);

  return {
    flowCount: allFlows.length,
    filesIndexed,
    filesSkipped,
    indexPath,
    durationMs: Date.now() - t0,
  };
}

// ---------------------------------------------------------------------------
// Public: loadIndex
// ---------------------------------------------------------------------------

export async function loadIndex(workspaceDir: string): Promise<IndexedFlow[]> {
  const indexPath = join(resolve(workspaceDir), INDEX_FILENAME);
  const index = await loadExistingIndex(indexPath);
  return index?.flows ?? [];
}
