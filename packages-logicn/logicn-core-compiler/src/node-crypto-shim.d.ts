declare module "node:crypto" {
  interface HashResult {
    update(data: string, encoding: string): HashResult;
    update(data: Uint8Array): HashResult;
    digest(format: "hex" | "base64" | "binary"): string;
  }
  export function createHash(algorithm: string): HashResult;
}
