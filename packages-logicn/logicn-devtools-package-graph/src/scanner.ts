/**
 * scanner.ts — extract the import surface of a single package
 *
 * Walks `<scope>/src/**\/*.ts` and, for each file, extracts every import/export
 * specifier. Each specifier is classified into one of four kinds so the graph
 * can separate INTERNAL structure from the EXTERNAL boundary:
 *
 *   internal   — relative path inside the package        ("./x", "../y")
 *   node_core  — Node.js built-in                        ("node:fs", "fs")
 *   workspace  — sibling LogicN package                  ("@logicn/...")
 *   thirdparty — any other bare specifier                ("axios", "lodash")
 *
 * Regex-based (no TypeScript-compiler dependency) to keep the tool dependency-light
 * and aligned with the existing scan-and-report devtools pattern. It recognises:
 *   import ... from "spec"      import "spec"      export ... from "spec"
 *   import("spec")  (dynamic)
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

export type EdgeKind = "internal" | "node_core" | "workspace" | "thirdparty";

export interface FileImport {
  readonly specifier: string;   // raw module specifier as written
  readonly kind: EdgeKind;
  readonly resolved?: string;   // for internal: normalised file path (best-effort)
}

export interface ScannedFile {
  readonly path: string;        // package-relative posix path, e.g. "src/bridge/interface.ts"
  readonly imports: readonly FileImport[];
  readonly exportsFrom: readonly string[]; // re-export specifiers (for index surface)
}

export interface ScanResult {
  readonly packageName: string;
  readonly scopePath: string;   // absolute scope root
  readonly files: readonly ScannedFile[];
}

const NODE_BUILTINS = new Set([
  "assert", "buffer", "child_process", "cluster", "console", "crypto", "dgram",
  "dns", "events", "fs", "http", "http2", "https", "net", "os", "path", "perf_hooks",
  "process", "querystring", "readline", "stream", "string_decoder", "timers", "tls",
  "tty", "url", "util", "v8", "vm", "worker_threads", "zlib",
]);

function classify(specifier: string): EdgeKind {
  if (specifier.startsWith("./") || specifier.startsWith("../")) return "internal";
  if (specifier.startsWith("node:")) return "node_core";
  const bare = specifier.split("/")[0] ?? specifier;
  if (NODE_BUILTINS.has(bare)) return "node_core";
  if (specifier.startsWith("@logicn/")) return "workspace";
  return "thirdparty";
}

// Matches: from "x" | import "x" | import("x") — single or double quotes.
const IMPORT_RE = /(?:import|export)\s+(?:[^"';]*?\sfrom\s+)?["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;
// Re-export form specifically: export ... from "x"
const REEXPORT_RE = /export\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g;

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try { s = statSync(full); } catch { continue; }
    if (s.isDirectory()) {
      if (name === "node_modules" || name === "dist") continue;
      out.push(...listTsFiles(full));
    } else if (name.endsWith(".ts") && !name.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

function readPackageName(scopePath: string): string {
  try {
    const pkg = JSON.parse(readFileSync(join(scopePath, "package.json"), "utf-8"));
    return pkg.name ?? scopePath;
  } catch {
    return scopePath;
  }
}

/** Strip line and block comments so commented-out imports are not counted. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1"); // line comments (avoid eating "://")
}

export function scanPackage(scopePath: string): ScanResult {
  const srcDir = join(scopePath, "src");
  const tsFiles = listTsFiles(srcDir);
  const packageName = readPackageName(scopePath);

  const files: ScannedFile[] = tsFiles.map((abs) => {
    const raw = stripComments(readFileSync(abs, "utf-8"));
    const relPath = relative(scopePath, abs).split(sep).join("/");

    const imports: FileImport[] = [];
    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    IMPORT_RE.lastIndex = 0;
    while ((m = IMPORT_RE.exec(raw)) !== null) {
      const spec = m[1] ?? m[2];
      if (!spec || seen.has(spec)) continue;
      seen.add(spec);
      imports.push({ specifier: spec, kind: classify(spec) });
    }

    const exportsFrom: string[] = [];
    REEXPORT_RE.lastIndex = 0;
    while ((m = REEXPORT_RE.exec(raw)) !== null) {
      if (m[1]) exportsFrom.push(m[1]);
    }

    return { path: relPath, imports, exportsFrom };
  });

  return { packageName, scopePath, files };
}
