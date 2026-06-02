import { pathToFileURL } from "node:url";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const __dir  = dirname(fileURLToPath(import.meta.url));
const lnRoot = join(__dir, "../../../logicn-core-compiler");

// ESM on Windows needs file:// URLs
const indexUrl = pathToFileURL(join(lnRoot, "dist/index.js")).href;
const rdUrl    = pathToFileURL(join(lnRoot, "dist/route-dispatcher.js")).href;

const { parseProgram } = await import(indexUrl);
const { startServer }  = await import(rdUrl);

const healthLln = join(lnRoot, "../../examples/auth-service/healthCheck.lln");
const source = readFileSync(healthLln, "utf8");
const parsed = parseProgram(source, "healthCheck.lln");

const server = await startServer(parsed.ast, parsed.flows, {
  port: 0, host: "127.0.0.1", mode: "dev", rateLimit: 100000,
});

process.stdout.write(JSON.stringify({ port: server.port }) + "\n");
process.on("SIGTERM", () => { server.close().then(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close().then(() => process.exit(0)); });
