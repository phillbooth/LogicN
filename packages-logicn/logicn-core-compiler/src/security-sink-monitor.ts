// =============================================================================
// LogicN — Secret Sink Monitor (DRCM Phase 1 — task #31)
//
// Runtime bridge for the compiler's interpreter.
// Full specification: packages-logicn/logicn-core-security/src/sink-monitor.ts
//
// Cleartext prefix scan replaces the broken SHA-256 hash comparison approach.
// =============================================================================

const MIN_SECRET_LENGTH = 12;
const PREFIX_TOKEN_LENGTH = 8;

/** Module-level singleton — one monitor per interpreter session */
class SecretSinkMonitor {
  readonly #prefixes = new Set<string>();

  /** Register a secret — extracts 8-char prefix if secret is ≥ 12 chars */
  register(rawSecret: string): void {
    if (rawSecret.length >= MIN_SECRET_LENGTH) {
      this.#prefixes.add(rawSecret.substring(0, PREFIX_TOKEN_LENGTH));
    }
  }

  /** Scan a payload for registered prefix substrings. Returns trap code or 0. */
  scan(payload: string): { isClean: boolean; trapCode: number } {
    for (const prefix of this.#prefixes) {
      if (payload.includes(prefix)) {
        return { isClean: false, trapCode: 3001 }; // LLN-SECRET-BREACH
      }
    }
    return { isClean: true, trapCode: 0 };
  }

  get count(): number { return this.#prefixes.size; }
  clear(): void { this.#prefixes.clear(); }
}

/** Session-scoped sink monitor singleton — reset between interpreter runs */
export const activeSinkMonitor = new SecretSinkMonitor();
