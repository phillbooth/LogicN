// =============================================================================
// Package Resolver Tests — Phase 17A
//
// Covers:
//   1. loadPackageManifest with missing file → undefined
//   2. loadPackageManifest with valid YAML → PackageManifest
//   3. resolvePackageTypes with types list → correct array
//   4. @logicn/domain-types registry includes "Email" and "UserId"
//   5. @logicn/enterprise-types registry includes expected types
//   6. @logicn/compute-types registry includes expected types
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  loadPackageManifest,
  resolvePackageTypes,
  resolveImports,
} from "../dist/index.js";

import { parseProgram } from "../dist/index.js";

// ── loadPackageManifest ───────────────────────────────────────────────────────

describe("loadPackageManifest — file resolution", () => {
  it("returns undefined when packagePath does not exist", () => {
    const result = loadPackageManifest("/nonexistent/path/to/package");
    assert.equal(result, undefined);
  });

  it("returns undefined when package.logicn.yaml is missing from real dir", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      const result = loadPackageManifest(dir);
      assert.equal(result, undefined);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parses a minimal package.logicn.yaml correctly", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      const yaml = [
        'name: "@myorg/types"',
        'version: "0.1.0"',
        "exports:",
        "  types:",
        "    - UserId",
        "    - Email",
        "effects: []",
      ].join("\n");

      writeFileSync(join(dir, "package.logicn.yaml"), yaml, "utf8");

      const manifest = loadPackageManifest(dir);
      assert.ok(manifest !== undefined, "Should parse manifest successfully");
      assert.equal(manifest.name, "@myorg/types");
      assert.equal(manifest.version, "0.1.0");
      assert.ok(
        manifest.exports.types?.includes("UserId"),
        `Types should include UserId, got: ${manifest.exports.types?.join(", ")}`,
      );
      assert.ok(
        manifest.exports.types?.includes("Email"),
        `Types should include Email, got: ${manifest.exports.types?.join(", ")}`,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("parses manifest with flows and events", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      const yaml = [
        'name: "@myorg/package"',
        'version: "1.0.0"',
        "exports:",
        "  types:",
        "    - MyType",
        "  flows:",
        "    - getUser",
        "    - createUser",
        "  events:",
        "    - UserCreated",
        "effects:",
        "  - db.read",
        "  - db.write",
        "capabilities:",
        "  - read.users",
      ].join("\n");

      writeFileSync(join(dir, "package.logicn.yaml"), yaml, "utf8");

      const manifest = loadPackageManifest(dir);
      assert.ok(manifest !== undefined);
      assert.ok(manifest.exports.flows?.includes("getUser"));
      assert.ok(manifest.exports.flows?.includes("createUser"));
      assert.ok(manifest.exports.events?.includes("UserCreated"));
      assert.ok(manifest.effects?.includes("db.read"));
      assert.ok(manifest.capabilities?.includes("read.users"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns undefined for malformed YAML missing name", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      // Missing name field — should return undefined
      const yaml = [
        'version: "0.1.0"',
        "exports:",
        "  types:",
        "    - UserId",
      ].join("\n");

      writeFileSync(join(dir, "package.logicn.yaml"), yaml, "utf8");

      const manifest = loadPackageManifest(dir);
      assert.equal(manifest, undefined, "Missing name should return undefined");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── resolvePackageTypes ───────────────────────────────────────────────────────

describe("resolvePackageTypes — type extraction", () => {
  it("returns manifest.exports.types as a readonly array", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      const yaml = [
        'name: "@test/pkg"',
        'version: "1.0.0"',
        "exports:",
        "  types:",
        "    - UserId",
        "    - Email",
        "    - PatientRecord",
      ].join("\n");

      writeFileSync(join(dir, "package.logicn.yaml"), yaml, "utf8");

      const manifest = loadPackageManifest(dir);
      assert.ok(manifest !== undefined);

      const types = resolvePackageTypes(manifest);
      assert.equal(types.length, 3);
      assert.ok(types.includes("UserId"));
      assert.ok(types.includes("Email"));
      assert.ok(types.includes("PatientRecord"));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns empty array when types not declared", () => {
    const dir = mkdtempSync(join(tmpdir(), "logicn-test-"));
    try {
      const yaml = [
        'name: "@test/pkg"',
        'version: "1.0.0"',
        "exports:",
        "  flows:",
        "    - getUser",
      ].join("\n");

      writeFileSync(join(dir, "package.logicn.yaml"), yaml, "utf8");

      const manifest = loadPackageManifest(dir);
      assert.ok(manifest !== undefined);

      const types = resolvePackageTypes(manifest);
      assert.equal(types.length, 0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("returns correct array for manifest with single type", () => {
    const manifest = {
      name: "@test/minimal",
      version: "0.0.1",
      exports: {
        types: ["MySpecialType"],
      },
    };

    const types = resolvePackageTypes(manifest);
    assert.equal(types.length, 1);
    assert.equal(types[0], "MySpecialType");
  });
});

// ── Registry: @logicn/domain-types ───────────────────────────────────────────

describe("@logicn/domain-types — extended registry", () => {
  it("resolveImports includes 'Email' as a type from @logicn/domain-types", () => {
    const { ast } = parseProgram(
      `import Email from "@logicn/domain-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    assert.ok(
      result.typeNames.includes("Email"),
      `Email should be a type from @logicn/domain-types, got typeNames: ${result.typeNames.join(", ")}`,
    );
  });

  it("resolveImports includes 'UserId' as a type from @logicn/domain-types", () => {
    const { ast } = parseProgram(
      `import UserId from "@logicn/domain-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    assert.ok(
      result.typeNames.includes("UserId"),
      `UserId should be a type from @logicn/domain-types, got typeNames: ${result.typeNames.join(", ")}`,
    );
  });

  it("resolveImports resolves all @logicn/domain-types members as types", () => {
    const { ast } = parseProgram(
      `import { Email, Url, Path, CurrencyCode, Reference, UserId, Actor, TraceId, TenantId, Deadline } from "@logicn/domain-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    const expected = ["Email", "Url", "Path", "CurrencyCode", "Reference", "UserId", "Actor", "TraceId", "TenantId", "Deadline"];
    for (const name of expected) {
      assert.ok(
        result.typeNames.includes(name),
        `${name} should be in typeNames for @logicn/domain-types`,
      );
    }
  });
});

// ── Registry: @logicn/enterprise-types ───────────────────────────────────────

describe("@logicn/enterprise-types — extended registry", () => {
  it("resolveImports includes 'Policy' as type from @logicn/enterprise-types", () => {
    const { ast } = parseProgram(
      `import Policy from "@logicn/enterprise-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    assert.ok(
      result.typeNames.includes("Policy"),
      `Policy should be a type from @logicn/enterprise-types`,
    );
  });

  it("resolveImports resolves AuditRecord and AuditProof from @logicn/enterprise-types", () => {
    const { ast } = parseProgram(
      `import { AuditRecord, AuditProof, ExecutionPlan, RuntimeReport } from "@logicn/enterprise-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    assert.ok(result.typeNames.includes("AuditRecord"), "AuditRecord should resolve");
    assert.ok(result.typeNames.includes("AuditProof"), "AuditProof should resolve");
    assert.ok(result.typeNames.includes("ExecutionPlan"), "ExecutionPlan should resolve");
    assert.ok(result.typeNames.includes("RuntimeReport"), "RuntimeReport should resolve");
  });
});

// ── Registry: @logicn/compute-types ──────────────────────────────────────────

describe("@logicn/compute-types — extended registry", () => {
  it("resolveImports includes 'ComputeTarget' from @logicn/compute-types", () => {
    const { ast } = parseProgram(
      `import ComputeTarget from "@logicn/compute-types"\n`,
      "test.lln",
    );
    const result = resolveImports(ast);
    assert.ok(
      result.typeNames.includes("ComputeTarget"),
      `ComputeTarget should be a type from @logicn/compute-types`,
    );
  });
});

// ── External package manifest resolution ─────────────────────────────────────

describe("resolveImports — external package.logicn.yaml lookup", () => {
  it("resolves type from external package with manifest via nodeModulesRoot", () => {
    const root = mkdtempSync(join(tmpdir(), "logicn-nm-"));
    try {
      // Set up fake node_modules/@myorg/customer-types/package.logicn.yaml
      const pkgDir = join(root, "@myorg", "customer-types");
      mkdirSync(pkgDir, { recursive: true });

      const yaml = [
        'name: "@myorg/customer-types"',
        'version: "0.2.0"',
        "exports:",
        "  types:",
        "    - CustomerId",
        "    - CustomerRecord",
      ].join("\n");

      writeFileSync(join(pkgDir, "package.logicn.yaml"), yaml, "utf8");

      const { ast } = parseProgram(
        `import { CustomerId, CustomerRecord } from "@myorg/customer-types"\n`,
        "test.lln",
      );

      const result = resolveImports(ast, root);
      assert.ok(
        result.typeNames.includes("CustomerId"),
        `CustomerId should resolve as type via manifest, typeNames: ${result.typeNames.join(", ")}`,
      );
      assert.ok(
        result.typeNames.includes("CustomerRecord"),
        `CustomerRecord should resolve as type via manifest`,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("returns empty (no error) for external package without manifest", () => {
    const { ast } = parseProgram(
      `import SomeType from "@unknown/package"\n`,
      "test.lln",
    );
    // No nodeModulesRoot — should silently fall back to value kind
    const result = resolveImports(ast);
    assert.equal(result.symbols.length, 1);
    assert.equal(result.symbols[0].name, "SomeType");
    // No error thrown
  });
});
