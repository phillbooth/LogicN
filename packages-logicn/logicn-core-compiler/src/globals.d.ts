// Global ambient declarations for Node.js built-in types not in standard lib.
// These supplement the module shims (node-crypto-shim.d.ts, etc.) for types
// that are referenced in global scope.

declare const Buffer: {
  from(data: string, encoding?: string): Uint8Array & { toString(encoding: string): string };
  from(data: ArrayBuffer | Uint8Array): Uint8Array & { toString(encoding: string): string };
  isBuffer(obj: unknown): boolean;
  concat(arrays: readonly Uint8Array[], totalLength?: number): Uint8Array & { toString(encoding: string): string };
};
