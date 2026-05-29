# 404 — Target WASM

**Concept:** WebAssembly compute target for browser or sandboxed execution

`compute target wasm` compiles the flow for execution inside a WebAssembly runtime — either a browser or a server-side WASM sandbox. The `fallback cpu` clause allows the same flow to run natively in non-WASM environments.

**AI rule:** Use `compute target wasm` when the flow must run inside a browser or a WASM sandbox.
