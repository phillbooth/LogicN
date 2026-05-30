declare module "node:fs" {
  export function appendFileSync(path: string, data: string, encoding: string): void;
  export function appendFileSync(path: string, data: Uint8Array): void;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function readFileSync(path: string): Buffer;
  export function writeFileSync(path: string, data: string, encoding: string): void;
  export function writeFileSync(path: string, data: Uint8Array): void;
}
