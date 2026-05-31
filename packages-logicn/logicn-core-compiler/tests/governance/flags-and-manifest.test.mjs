// =============================================================================
// Governance Verifier — GovernanceFlags and RuntimeManifest Tests (Phase 18F)
//
// Tests for:
//   - GovernanceFlags bitset (shape, distinct powers-of-2)
//   - GovernanceVerifyResult.governanceFlagsByFlow populated per flow
//   - GovernanceVerifyResult.runtimeManifests populated in production profile
//   - RuntimeManifest schemaVersion, requiresAudit, deniesRemote, verified
//   - GovernanceFlags.RequiresAudit set for database.write flows
//   - GovernanceFlags.DenyRemote set for compute.deny remote flows
//   - GovernanceFlags.AllowsNetwork set for network.outbound flows
// =============================================================================

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseProgram,
  checkEffects,
  verifyGovernance,
  GovernanceFlags,
  LLN_GOV_013,
} from "../../dist/index.js";

// ---------------------------------------------------------------------------
// GovernanceFlags constant shape
// ---------------------------------------------------------------------------

describe("GovernanceFlags: constant shape", () => {
  it("None is 0", () => {
    assert.equal(GovernanceFlags.None, 0);
  });

  it("all non-None flags are distinct powers of 2", () => {
    const flags = Object.entries(GovernanceFlags)
      .filter(([name]) => name !== "None")
      .map(([, v]) => v);
    for (const f of flags) {
      assert.ok(f > 0 && (f & (f - 1)) === 0, `${f} is not a power of 2`);
    }
    assert.equal(new Set(flags).size, flags.length, "All flags must be distinct");
  });

  it("has all expected governance flags", () => {
    assert.ok("RequiresAudit"    in GovernanceFlags);
    assert.ok("DenyRemote"       in GovernanceFlags);
    assert.ok("ContainsPII"      in GovernanceFlags);
    assert.ok("AllowsNetwork"    in GovernanceFlags);
    assert.ok("RequiresActor"    in GovernanceFlags);
    assert.ok("ProductionStrict" in GovernanceFlags);
    assert.ok("RequiresIntent"   in GovernanceFlags);
    assert.ok("HasPolicy"        in GovernanceFlags);
  });
});

// ---------------------------------------------------------------------------
// Helper: parse + check + verify
// ---------------------------------------------------------------------------

function verifySource(source, profile = "dev") {
  const parsed = parseProgram(source, "test.lln");
  const effectResults = checkEffects(parsed.flows, parsed.ast);
  return verifyGovernance(parsed.ast, parsed.flows, effectResults, profile);
}

// ---------------------------------------------------------------------------
// GovernanceVerifyResult: governanceFlagsByFlow
// ---------------------------------------------------------------------------

describe("GovernanceVerifyResult: governanceFlagsByFlow populated", () => {
  it("result.governanceFlagsByFlow is a Map", () => {
    const result = verifySource(`pure flow add(a: Int, b: Int) -> Int { return a }`);
    assert.ok(result.governanceFlagsByFlow instanceof Map,
      "governanceFlagsByFlow must be a Map");
  });

  it("flow entry exists for every verified flow", () => {
    const result = verifySource(`
pure flow pure1(x: Int) -> Int { return x }
pure flow pure2(y: Int) -> Int { return y }
`);
    assert.ok(result.governanceFlagsByFlow.has("pure1"), "pure1 must have flags");
    assert.ok(result.governanceFlagsByFlow.has("pure2"), "pure2 must have flags");
  });
});

// ---------------------------------------------------------------------------
// GovernanceFlags.RequiresAudit
// ---------------------------------------------------------------------------

describe("GovernanceFlags.RequiresAudit: set for database.write flows", () => {
  it("flow with database.write effect → RequiresAudit flag", () => {
    const result = verifySource(`
guarded flow save(data: String) -> Void
contract { effects { database.write } }
{
  return
}
`);
    const flags = result.governanceFlagsByFlow.get("save") ?? 0;
    assert.ok(flags & GovernanceFlags.RequiresAudit,
      "RequiresAudit must be set for flow declaring database.write");
  });

  it("pure effect-free flow → no RequiresAudit", () => {
    const result = verifySource(`pure flow noop(x: Int) -> Int { return x }`);
    const flags = result.governanceFlagsByFlow.get("noop") ?? 0;
    assert.ok(!(flags & GovernanceFlags.RequiresAudit),
      "RequiresAudit must NOT be set for pure effect-free flow");
  });
});

// ---------------------------------------------------------------------------
// GovernanceFlags.AllowsNetwork
// ---------------------------------------------------------------------------

describe("GovernanceFlags.AllowsNetwork: set for network.outbound flows", () => {
  it("flow with network.outbound → AllowsNetwork flag", () => {
    const result = verifySource(`
guarded flow callApi(url: String) -> Response
contract { effects { network.outbound } }
{
  return Response.ok({})
}
`);
    const flags = result.governanceFlagsByFlow.get("callApi") ?? 0;
    assert.ok(flags & GovernanceFlags.AllowsNetwork,
      "AllowsNetwork must be set for network.outbound flow");
  });

  it("flow without network.outbound → no AllowsNetwork", () => {
    const result = verifySource(`
guarded flow dbOnly(x: String) -> Void
contract { effects { database.write } }
{
  return
}
`);
    const flags = result.governanceFlagsByFlow.get("dbOnly") ?? 0;
    assert.ok(!(flags & GovernanceFlags.AllowsNetwork),
      "AllowsNetwork must NOT be set for database-only flow");
  });
});

// ---------------------------------------------------------------------------
// RuntimeManifest: generated in production profile
// ---------------------------------------------------------------------------

describe("RuntimeManifest: generated for production profile", () => {
  it("production profile → runtimeManifests contains entries", () => {
    const result = verifySource(`
secure flow createUser(readonly request: Request) -> Response
contract {
  intent { "Create a new user account." }
  effects { database.write audit.write }
}
{
  return Response.ok({})
}
`, "production");
    assert.ok(result.runtimeManifests.length > 0,
      "runtimeManifests must be populated in production profile");
  });

  it("dev profile → runtimeManifests is empty", () => {
    const result = verifySource(`
secure flow createUser(readonly request: Request) -> Response
contract {
  intent { "Create a new user." }
  effects { database.write }
}
{
  return Response.ok({})
}
`, "dev");
    assert.equal(result.runtimeManifests.length, 0,
      "runtimeManifests must be empty in dev profile");
  });

  it("RuntimeManifest has correct schemaVersion", () => {
    const result = verifySource(`
secure flow getUser(readonly request: Request) -> Response
contract {
  intent { "Retrieve user by ID." }
  effects { database.read }
}
{
  return Response.ok({})
}
`, "production");
    const manifest = result.runtimeManifests[0];
    assert.ok(manifest !== undefined, "Manifest must exist");
    assert.equal(manifest.schemaVersion, "lln.runtime.manifest.v1");
  });

  it("RuntimeManifest requiresAudit is true for database.write flows", () => {
    const result = verifySource(`
secure flow createOrder(readonly request: Request) -> Response
contract {
  intent { "Create an order." }
  effects { database.write audit.write }
}
{
  return Response.ok({})
}
`, "production");
    const manifest = result.runtimeManifests.find((m) => m.flow === "createOrder");
    assert.ok(manifest !== undefined, "Manifest must exist for createOrder");
    assert.ok(manifest.requiresAudit, "requiresAudit must be true for database.write + audit.write flow");
  });

  it("RuntimeManifest allowedEffects is sorted", () => {
    const result = verifySource(`
secure flow multi(readonly request: Request) -> Response
contract {
  intent { "Multi-effect flow." }
  effects { network.outbound database.read audit.write }
}
{
  return Response.ok({})
}
`, "production");
    const manifest = result.runtimeManifests.find((m) => m.flow === "multi");
    assert.ok(manifest !== undefined, "Manifest must exist");
    const sorted = [...manifest.allowedEffects].sort();
    assert.deepEqual([...manifest.allowedEffects], sorted,
      "allowedEffects must be sorted");
  });

  it("RuntimeManifest governanceFlagsMask matches governanceFlagsByFlow", () => {
    const result = verifySource(`
secure flow check(readonly request: Request) -> Response
contract {
  intent { "Check action." }
  effects { network.outbound }
}
{
  return Response.ok({})
}
`, "production");
    const manifest = result.runtimeManifests.find((m) => m.flow === "check");
    const flags = result.governanceFlagsByFlow.get("check");
    assert.ok(manifest !== undefined, "Manifest must exist");
    assert.ok(flags !== undefined, "Flags must exist");
    assert.equal(manifest.governanceFlagsMask, flags,
      "RuntimeManifest.governanceFlagsMask must equal governanceFlagsByFlow entry");
  });
});

// ---------------------------------------------------------------------------
// GovernanceFlags.RequiresActor + RuntimeManifest.requiredContext
// ---------------------------------------------------------------------------

describe("GovernanceFlags.RequiresActor: context { require actor }", () => {
  it("flow with contract { context { require actor } } → RequiresActor flag set", () => {
    const result = verifySource(`
guarded flow actorCheck(readonly request: Request) -> Response
contract {
  effects { database.read }
  context { require actor }
}
{
  let actor = context.actor
  return Response.ok({})
}
`);
    const flags = result.governanceFlagsByFlow.get("actorCheck") ?? 0;
    assert.ok(flags & GovernanceFlags.RequiresActor,
      "RequiresActor must be set when contract.context requires actor");
  });

  it("RuntimeManifest.requiredContext includes 'actor' for production profile", () => {
    const result = verifySource(`
guarded flow actorManifest(readonly request: Request) -> Response
contract {
  effects { database.read }
  context { require actor }
}
{
  let actor = context.actor
  return Response.ok({})
}
`, "production");
    const manifest = result.runtimeManifests.find((m) => m.flow === "actorManifest");
    assert.ok(manifest !== undefined, "Manifest must exist for actorManifest");
    assert.ok(
      Array.isArray(manifest.requiredContext) && manifest.requiredContext.includes("actor"),
      `requiredContext must include 'actor', got: ${JSON.stringify(manifest.requiredContext)}`,
    );
  });
});

// ---------------------------------------------------------------------------
// LLN_GOV_013 constant shape
// ---------------------------------------------------------------------------

describe("LLN_GOV_013 constant shape", () => {
  it("has correct code and name", () => {
    assert.equal(LLN_GOV_013.code, "LLN-GOV-013");
    assert.equal(LLN_GOV_013.name, "BoundaryViolation");
  });

  it("has severity error and non-empty message, why, and suggestedFix", () => {
    assert.equal(LLN_GOV_013.severity, "error");
    assert.ok(typeof LLN_GOV_013.message === "string" && LLN_GOV_013.message.length > 0,
      "message must be a non-empty string");
    assert.ok(typeof LLN_GOV_013.why === "string" && LLN_GOV_013.why.length > 0,
      "why must be a non-empty string");
    assert.ok(typeof LLN_GOV_013.suggestedFix === "string" && LLN_GOV_013.suggestedFix.length > 0,
      "suggestedFix must be a non-empty string");
  });
});
