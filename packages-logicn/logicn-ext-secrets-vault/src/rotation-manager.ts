/**
 * logicn-ext-secrets-vault — SecretsRotationManager
 *
 * Implements the dual-token validation window described in the design doc:
 *
 *   Stage new value → quiesce (50 ms drain window) → atomic swap → zero-wipe old slot
 *
 * The guest is never restarted; in-flight reads using the old value complete
 * safely within the quiesce window before the swap happens.
 */
import type { SecretCredential, SecretHandle } from "./types.js";
import type { VaultClient } from "./vault-client.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Quiesce wait: allow in-flight reads to drain before the atomic swap. */
const QUIESCE_MS = 50;

// ---------------------------------------------------------------------------
// Public class
// ---------------------------------------------------------------------------

export class SecretsRotationManager {
  /** credential-id → live handle */
  private readonly handles: Map<string, SecretHandle> = new Map();

  /**
   * Load a credential from Vault and store it as the active handle.
   * If a handle for this id already exists it is replaced (fresh load).
   */
  async load(
    credential: SecretCredential,
    vaultClient: VaultClient
  ): Promise<void> {
    const raw = await vaultClient.readSecret(
      credential.path,
      credential.mountPoint ?? "secret"
    );
    const existing = this.handles.get(credential.id);
    const version = existing !== undefined ? existing.version + 1 : 1;

    // Zero-wipe the old active value if we're replacing
    if (existing !== undefined) {
      existing.activeValue.fill(0);
      if (existing.stagingValue !== null) {
        existing.stagingValue.fill(0);
      }
    }

    this.handles.set(credential.id, {
      id: credential.id,
      activeValue: raw,
      stagingValue: null,
      version,
    });
  }

  /**
   * Dual-token rotation:
   *   1. Fetch new secret from Vault → store in stagingValue
   *   2. Quiesce: wait QUIESCE_MS for in-flight reads to complete
   *   3. Atomic swap: activeValue ← stagingValue
   *   4. Zero-wipe the old active buffer
   *   5. Clear stagingValue
   */
  async rotate(
    credentialId: string,
    vaultClient: VaultClient,
    credential?: SecretCredential
  ): Promise<void> {
    const handle = this.handles.get(credentialId);
    if (handle === undefined) {
      throw new Error(
        `SecretsRotationManager.rotate: unknown credential "${credentialId}"`
      );
    }

    // Step 1 — fetch new value into the staging slot
    const path = credential?.path ?? credentialId;
    const mountPoint = credential?.mountPoint ?? "secret";
    const newValue = await vaultClient.readSecret(path, mountPoint);
    handle.stagingValue = newValue;

    // Step 2 — quiesce: give in-flight reads time to drain
    await new Promise<void>((res) => setTimeout(res, QUIESCE_MS));

    // Step 3 — atomic swap (JS is single-threaded; no lock needed)
    const oldActive = handle.activeValue;
    handle.activeValue = handle.stagingValue;
    handle.stagingValue = null;

    // Step 4 — zero-wipe the stale buffer so it cannot be scanned from memory
    oldActive.fill(0);

    // Bump version (read-only property pattern: cast through unknown)
    (handle as unknown as { version: number }).version += 1;
  }

  /**
   * Return the current active value for a credential, or undefined if not loaded.
   * The returned Buffer is a REFERENCE to the internal buffer — callers must not
   * retain it beyond the current microtask (a rotation may zero-wipe it).
   */
  getActive(credentialId: string): Buffer | undefined {
    return this.handles.get(credentialId)?.activeValue;
  }

  /**
   * Return the full handle (internal — used by CLI status command).
   * @internal
   */
  getHandle(credentialId: string): SecretHandle | undefined {
    return this.handles.get(credentialId);
  }

  /**
   * Return all credential ids currently loaded.
   */
  listIds(): string[] {
    return Array.from(this.handles.keys());
  }

  /**
   * Start a background rotation sweep that rotates all credentials on a
   * fixed interval.  Returns the timer so the caller can stop it.
   */
  startRotationSweep(
    credentials: SecretCredential[],
    vaultClient: VaultClient,
    intervalMs: number
  ): NodeJS.Timeout {
    return setInterval(() => {
      for (const cred of credentials) {
        this.rotate(cred.id, vaultClient, cred).catch((err: unknown) => {
          console.error(
            `[logicn-ext-secrets-vault] rotation fault for "${cred.id}":`,
            err
          );
        });
      }
    }, intervalMs);
  }

  /**
   * Stop a running rotation sweep timer.
   */
  stopRotationSweep(timer: NodeJS.Timeout): void {
    clearInterval(timer);
  }

  /**
   * Zero-wipe all loaded handles and clear the map.
   * Should be called on shutdown.
   */
  dispose(): void {
    for (const handle of this.handles.values()) {
      handle.activeValue.fill(0);
      if (handle.stagingValue !== null) {
        handle.stagingValue.fill(0);
      }
    }
    this.handles.clear();
  }
}
