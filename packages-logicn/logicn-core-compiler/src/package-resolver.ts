// =============================================================================
// LogicN Phase 17A — Package Manifest Resolver
//
// Resolves package.logicn.yaml manifest files from package directories.
// This allows user packages to declare their exported types, flows, events,
// effects, and capability requirements in a structured manifest format.
//
// No external YAML dependencies — uses a simple line-by-line parser
// that handles the subset of YAML used in package.logicn.yaml files.
// =============================================================================

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly exports: {
    readonly types?: readonly string[];
    readonly flows?: readonly string[];
    readonly events?: readonly string[];
  };
  readonly effects?: readonly string[];
  readonly capabilities?: readonly string[];
}

// ---------------------------------------------------------------------------
// Minimal YAML parser
//
// Handles the strict subset used by package.logicn.yaml:
//
//   name: "@myorg/types"
//   version: "0.1.0"
//   exports:
//     types:
//       - UserId
//       - Email
//     flows:
//       - getUser
//     events:
//       - UserCreated
//   effects:
//     - db.read
//   capabilities:
//     - read.patients
//
// Rules:
//   - Top-level keys and one-level-deep section keys (exports, effects,
//     capabilities) are supported.
//   - String values are unquoted or quoted with " or '.
//   - List items start with "  - value" (indented dash).
//   - Lines starting with # are comments.
//   - Empty lines are ignored.
// ---------------------------------------------------------------------------

interface ParsedYaml {
  [key: string]: string | string[] | { [key: string]: string | string[] };
}

function stripQuotes(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

function parseSimpleYaml(text: string): ParsedYaml {
  const result: ParsedYaml = {};
  const lines = text.split(/\r?\n/);

  // Tracks the current "context":
  //   - topKey: active top-level key (e.g. "exports", "effects")
  //   - subKey: active sub-key inside topKey (e.g. "types" inside "exports")
  //   - mode: "section" (topKey maps to an object), "top-list" (topKey maps to a list)
  //           "sub-list" (subKey inside topKey maps to a list)

  let topKey: string | null = null;
  let subKey: string | null = null;
  type Mode = "section" | "top-list" | "sub-list" | "scalar" | null;
  let mode: Mode = null;
  let pendingList: string[] = [];

  function flushPendingList(): void {
    if (mode === "top-list" && topKey !== null) {
      result[topKey] = pendingList.slice();
    } else if (mode === "sub-list" && topKey !== null && subKey !== null) {
      const section = result[topKey];
      if (typeof section === "object" && !Array.isArray(section)) {
        (section as Record<string, string | string[]>)[subKey] = pendingList.slice();
      }
    }
    pendingList = [];
  }

  function resetSubKey(): void {
    flushPendingList();
    subKey = null;
    mode = topKey !== null ? "section" : null;
  }

  function resetTopKey(newKey: string): void {
    flushPendingList();
    topKey = newKey;
    subKey = null;
    pendingList = [];
    mode = null;
  }

  for (const rawLine of lines) {
    // Skip blank lines and comments
    if (rawLine.trim() === "" || rawLine.trim().startsWith("#")) continue;

    const indent = rawLine.length - rawLine.trimStart().length;
    const line = rawLine.trimStart();

    // ── List item ──
    if (line.startsWith("- ") || line === "-") {
      const val = stripQuotes(line.startsWith("- ") ? line.slice(2).trim() : "");

      if (mode === "top-list" && topKey !== null) {
        // Continuing a top-level list (e.g. under "effects:")
        pendingList.push(val);
      } else if (mode === "sub-list" && subKey !== null) {
        // Continuing a sub-list (e.g. under "  types:")
        pendingList.push(val);
      } else if (mode === "section" || mode === null) {
        // First list item — figure out context from indent
        if (indent === 2 && subKey !== null) {
          // Sub-list for current subKey
          flushPendingList();
          mode = "sub-list";
          pendingList = [val];
        } else if (indent === 2 && topKey !== null) {
          // Top-level list (section with only list items, no sub-keys yet)
          flushPendingList();
          mode = "top-list";
          pendingList = [val];
        } else if (indent === 0 && topKey !== null) {
          // Bare top-level list (shouldn't normally appear but handle gracefully)
          flushPendingList();
          mode = "top-list";
          pendingList = [val];
        }
      }
      continue;
    }

    // ── Key: value or section header ──
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1).trim();

    if (indent === 0) {
      // Top-level key
      resetTopKey(key);

      if (rest === "") {
        // Section header — children follow (either mapping or list)
        result[key] = {};   // provisionally a mapping; may become a list
        mode = "section";
      } else {
        // Scalar top-level value
        result[key] = stripQuotes(rest);
        topKey = null;
        mode = "scalar";
      }
    } else if (indent === 2 && topKey !== null) {
      // Sub-key inside top-level section
      resetSubKey();
      subKey = key;

      const section = result[topKey];
      if (typeof section !== "object" || Array.isArray(section)) {
        result[topKey] = {};
      }

      if (rest === "") {
        // Sub-section header — list follows
        mode = "sub-list";
        pendingList = [];
      } else {
        // Scalar sub-value
        const target = result[topKey] as Record<string, string | string[]>;
        target[key] = stripQuotes(rest);
        mode = "section";
      }
    }
    // Deeper indentation (4+) is ignored — not needed for this format
  }

  // Flush any pending list at end of file
  flushPendingList();
  return result;
}

// ---------------------------------------------------------------------------
// Manifest extraction helpers
// ---------------------------------------------------------------------------

function asStringArray(val: unknown): readonly string[] {
  if (Array.isArray(val)) {
    return (val as unknown[]).filter((v): v is string => typeof v === "string");
  }
  return [];
}

function parseManifest(yaml: ParsedYaml): PackageManifest | undefined {
  const name = typeof yaml["name"] === "string" ? yaml["name"] : "";
  const version = typeof yaml["version"] === "string" ? yaml["version"] : "";

  if (name === "" || version === "") return undefined;

  const exportsRaw = yaml["exports"];
  let types: readonly string[] = [];
  let flows: readonly string[] = [];
  let events: readonly string[] = [];

  if (exportsRaw !== null && typeof exportsRaw === "object" && !Array.isArray(exportsRaw)) {
    const exportsMap = exportsRaw as Record<string, unknown>;
    types = asStringArray(exportsMap["types"]);
    flows = asStringArray(exportsMap["flows"]);
    events = asStringArray(exportsMap["events"]);
  }

  const effects = asStringArray(yaml["effects"]);
  const capabilities = asStringArray(yaml["capabilities"]);

  return {
    name,
    version,
    exports: { types, flows, events },
    effects,
    capabilities,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Loads and parses a package.logicn.yaml manifest from `packagePath`.
 *
 * Returns `undefined` if the file does not exist or cannot be parsed.
 */
export function loadPackageManifest(packagePath: string): PackageManifest | undefined {
  const manifestPath = join(packagePath, "package.logicn.yaml");

  if (!existsSync(manifestPath)) return undefined;

  let text: string;
  try {
    text = readFileSync(manifestPath, "utf8");
  } catch {
    return undefined;
  }

  try {
    const parsed = parseSimpleYaml(text);
    return parseManifest(parsed);
  } catch {
    return undefined;
  }
}

/**
 * Returns the list of type names exported by the manifest.
 * Equivalent to `manifest.exports.types ?? []`.
 */
export function resolvePackageTypes(manifest: PackageManifest): readonly string[] {
  return manifest.exports.types ?? [];
}
