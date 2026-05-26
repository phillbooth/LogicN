import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineEnvironmentVariableReference,
  loadConfigFromObjects,
  parseEnvironmentConfig,
  validateHostPackageManifestBoundary,
} from "../dist/index.js";

describe("logicn-core-config contracts", () => {
  it("loads a runtime handoff from project and environment objects", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: ["packages-logicn/logicn-framework-example-app/src/index.lln"],
        packages: ["packages-logicn/logicn-core", "packages-logicn/logicn-core-config", "packages-logicn/logicn-framework-example-app"],
        strict: true,
        targets: ["cpu", "wasm"],
      },
      environment: {
        mode: "production",
        variables: ["LOGICN_APP_ENV"],
        secrets: [{ name: "LOGICN_APP_SECRET", required: true }],
      },
      availableEnvironment: {
        LOGICN_APP_ENV: "production",
        LOGICN_APP_SECRET: "set",
      },
      generatedAt: "2026-05-08T00:00:00.000Z",
    });

    assert.equal(result.runtime?.canRun, true);
    assert.equal(result.runtime?.environment.mode, "production");
    assert.deepEqual(result.diagnostics, []);
  });

  it("reports missing production secrets without exposing values", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: [],
        packages: [],
        strict: true,
        targets: [],
      },
      environment: {
        mode: "production",
        secrets: ["LOGICN_APP_SECRET"],
      },
      availableEnvironment: {},
    });

    assert.equal(result.runtime?.canRun, false);
    assert.equal(
      result.diagnostics[0]?.code,
      "LLN-CONFIG-004",
    );
    assert.match(result.diagnostics[0]?.message ?? "", /LOGICN_APP_SECRET/);
    assert.doesNotMatch(result.diagnostics[0]?.message ?? "", /undefined|null|set/);
  });

  it("requires environment validation before production runtime handoff", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: [],
        packages: [],
        strict: true,
        targets: [],
      },
      environment: {
        mode: "production",
      },
    });

    assert.equal(result.runtime?.canRun, false);
    assert.equal(
      result.diagnostics[0]?.code,
      "LLN-CONFIG-005",
    );
  });

  it("disables benchmark packages by default in production", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: [],
        packages: [
          "packages-logicn/logicn-core",
          "packages-logicn/logicn-tools-benchmark",
        ],
        strict: true,
        targets: [],
      },
      environment: {
        mode: "production",
      },
      availableEnvironment: {},
    });

    assert.equal(result.runtime?.canRun, false);
    assert.equal(
      result.diagnostics.at(-1)?.code,
      "LLN-CONFIG-012",
    );
  });

  it("allows explicit reported production package overrides", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: [],
        packages: [
          "packages-logicn/logicn-core",
          "packages-logicn/logicn-tools-benchmark",
        ],
        production: {
          packageOverrides: [
            {
              path: "packages-logicn/logicn-tools-benchmark",
              reason: "One-off production hardware validation before launch.",
              expires: "2026-06-01",
            },
          ],
        },
        strict: true,
        targets: [],
      },
      environment: {
        mode: "production",
      },
      availableEnvironment: {},
    });

    assert.equal(result.runtime?.canRun, true);
    assert.equal(
      result.runtime?.activeProductionPackageOverrides[0]?.path,
      "packages-logicn/logicn-tools-benchmark",
    );
    assert.deepEqual(result.diagnostics, []);
  });

  it("can forbid production package overrides by policy", () => {
    const result = loadConfigFromObjects({
      project: {
        name: "logicn-app",
        version: "0.1.0",
        root: ".",
        entryFiles: [],
        packages: ["packages-logicn/logicn-tools-benchmark"],
        production: {
          packageOverrides: [
            {
              path: "packages-logicn/logicn-tools-benchmark",
              reason: "Temporary validation.",
            },
          ],
        },
        strict: true,
        targets: [],
      },
      environment: {
        mode: "production",
      },
      availableEnvironment: {},
      productionPolicy: {
        allowProductionPackageOverrides: false,
      },
    });

    assert.equal(result.runtime?.canRun, false);
    assert.equal(
      result.diagnostics.at(-1)?.code,
      "LLN-CONFIG-013",
    );
  });

  it("normalises safe environment variable references", () => {
    const reference = defineEnvironmentVariableReference("LOGICN_CACHE_TTL", {
      required: false,
      scope: "runtime",
      defaultValue: "60",
    });
    const result = parseEnvironmentConfig({
      mode: "development",
      variables: [reference],
    });

    assert.equal(result.environment?.variables[0]?.kind, "env");
    assert.equal(result.environment?.variables[0]?.secret, false);
    assert.equal(result.diagnostics.length, 0);
  });

  it("keeps LogicN package graph fields out of host package manifests", () => {
    const diagnostics = validateHostPackageManifestBoundary({
      name: "logicn-host-app",
      version: "0.1.0",
      loPackages: ["packages-logicn/logicn-core"],
      dependencies: {
        "logicn-package-graph": "1.0.0",
      },
    });

    assert.equal(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "LLN-CONFIG-007",
      ),
      true,
    );
    assert.equal(
      diagnostics.some(
        (diagnostic) =>
          diagnostic.code === "LLN-CONFIG-009",
      ),
      true,
    );
  });

  it("allows package.json to remain a host tooling manifest", () => {
    const diagnostics = validateHostPackageManifestBoundary({
      name: "logicn-host-app",
      version: "0.1.0",
      scripts: {
        test: "node --test",
      },
      devDependencies: {
        typescript: "^5.5.0",
      },
    });

    assert.deepEqual(diagnostics, []);
  });
});
