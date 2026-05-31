# LogicN — Security Model: Four Layers

## Status

```
Core design — applies across all phases
Language security: implemented (Phase 1-15)
Effect/capability security: implemented (Phase 11C, 13A, 14)
Boundary security: implemented (value-state checker, Phase 6+)
Network security: documented, partial enforcement
Runtime security: Phase 11C+, partial
Package security: Phase 17 (package manifests)
Build security: logicn build --production (Phase 13B)
```

## The Security Principle

```
Declare everything.
Deny by default.
Validate before trust.
Audit every authority use.
```

---

## Layer 1: Language Security

Already enforced by the compiler at every build:

| Feature | Enforcement |
|---|---|
| No hidden nulls | `Option<T>` required; LLN-TYPE-008 on null/undefined |
| No silent failures | `Result<T,E>` required; no throw/catch |
| Explicit mutability | `let` = immutable, `mut` = explicit, `readonly` = read-only view |
| Explicit effects | `contract.effects {}` or `with effects [...]` required |
| Explicit unsafe | `unsafe let raw` marks boundary origin; LLN-VALUESTATE-003 if misused |
| Protected/redacted | Governance qualifiers enforced by type system |
| No top-level state | `let`/`mut` outside flows = LLN-SYNTAX-006/007 |

These are non-negotiable. The language is honest by construction.

---

## Layer 2: Effect and Capability Security

```logicn
secure flow createUser(readonly request: Request) -> CreateUserResult
contract {
  effects {
    database.write
    audit.write
  }
}
```

Enforcement chain:
```
undeclared effect used     → LLN-EFFECT-001 (compiler error)
effect without capability  → capabilityHost.check() → denied (runtime)
capability not in policy   → RootCapabilityProvider → denied (runtime)
```

The `capabilityHost.ts` ensures no side-effect bypasses governance:
- `AuditLog.write` → `host.audit.write` (checked)
- `http.get()` → `host.network.outbound` (checked)
- `fs.read()` → `host.filesystem.read` (checked)
- No `globalThis`, `process`, `eval` → LLN-BACKEND-001 / LLN-SOURCE-ESCAPE-001

---

## Layer 3: Boundary and Data Security

External data is always unsafe until validated:

```logicn
// 1. Boundary — always unsafe
unsafe let rawEmail: String = request.body.email

// 2. Validation gate — breaks taint chain
let email: protected Email = validate.email(rawEmail)?

// 3. Redaction — safe for audit/logs
AuditLog.write({ email: redact(email) })
```

Compiler enforcements:
- `unsafe` at governed sink → LLN-VALUESTATE-003
- Two-hop taint (`rawEmail.trim()` at sink) → LLN-VALUESTATE-005
- `protected Email` in response without `response.denies` → LLN-GOV-003
- `SecureString` in log → LLN-SECRET-001
- `SecureString` compared with `==` → LLN-SECRET-002
- Sensitive binding name without SecureString → LLN-STYLE-SEC-001

---

## Layer 4: Network Security

Production defaults must be strict. LogicN services should:

```text
deny plaintext HTTP          → require TLS
validate certificates        → no certificate bypass
validate hostnames           → no wildcard outbound
deny protocol downgrade      → HTTPS only
deny secrets in URLs         → SecureString cannot appear in URL strings
deny unknown outbound hosts  → network.outbound requires explicit host policy
```

Implementation:
- `contract.rules { deny network.outbound unless approved.host }` — future Phase 17
- `contract.privacy { deny protected values to network }` — implemented
- `LLN-NETWORK-001 SecretInUrl` — future diagnostic
- `LLN-NETWORK-002 PlaintextHttp` — future diagnostic

---

## Layer 5: Runtime Security

The runtime enforces what the compiler declares:

```text
deny-by-default capabilities        → capabilityHost.check() before every effect
per-request memory boundary         → request boundary destroyed on completion
resource budgets                    → contractEnforcer.checkRequestSize() / checkDeadline()
timeouts                            → contractEnforcer timeout enforcement
rate limits                         → limits contract section (Phase 16+)
audit proof per secure flow         → runtime report + signed attestation
denial logs                         → capabilityHost records denied capability attempts
safe degraded mode                  → fallback {} block (Phase 18)
```

Runtime authority is granted narrowly via `RootCapabilityProvider`:
- Compiler authority ≠ user program authority (isolated domains)
- Generated JS uses `capabilityHost` not `globalThis`/`process`/`require`
- `LLN-BUILD-001` fires if build is non-deterministic

---

## Layer 6: Package Security

```yaml
# package.logicn.yaml — explicit package manifest
name: "@myorg/customer-types"
version: "0.1.0"
exports:
  types:
    - CustomerId
    - CustomerEmail
effects: []        # this package causes no effects
capabilities: []   # this package requires no capabilities
```

No package silently widens authority:
- Packages declare `exports`, `effects`, `capabilities`
- Package that adds effects requires explicit flow declaration
- Future: `trusted`, `signatures`, `checksums` fields
- Future: `LLN-PACKAGE-001 CapabilityExpansion` — package widens authority without declaration

---

## Layer 7: Build and Deployment Security

`logicn build --production` fails on:

```text
undeclared effects in any secure flow      → LLN-EFFECT-001
missing effects from LLN-EFFECT-002 callee → LLN-EFFECT-002
plaintext networking without TLS           → future LLN-NETWORK-002
secret/SecureString in logs                → LLN-SECRET-001
unsafe debug mode patterns                 → LLN-SOURCE-ESCAPE-001
protected data in response without policy  → LLN-GOV-003
missing audit on governed flows            → LLN-GOV-002
untrusted package capability expansion     → future LLN-PACKAGE-001
non-deterministic build                    → LLN-BUILD-001
```

`service.manifest.json` emitted per service — DevOps can audit authority before deployment.

---

## What LogicN Should Never Silently Trust

| What | Why | Enforcement |
|---|---|---|
| External input | Boundary data is unsafe until validated | `unsafe let` + validation gate |
| Package authority | Packages can widen attack surface | `package.logicn.yaml` explicit |
| Network | Untrusted external world | TLS required, hosts declared |
| Effects | Side-effects must be declared | LLN-EFFECT-001 |
| Capabilities | Runtime authority must be bounded | capabilityHost.check() |
| Memory | Protected values have ownership | governedMemory.ts |
| Generated code | JS output must not use ambient authority | LLN-BACKEND-001 |

---

## Implementation Status by Layer

| Layer | Status |
|---|---|
| Language security | ✅ Implemented (Phase 1-15) |
| Effect/capability security | ✅ Implemented (LLN-EFFECT-001..004, capabilityHost) |
| Boundary/data security | ✅ Implemented (LLN-VALUESTATE-*, LLN-SECRET-*, LLN-GOV-003) |
| Network security | ⚠️ Partial (privacy contract enforced; TLS/host policy Phase 17) |
| Runtime security | ⚠️ Partial (contractEnforcer, capabilityHost; full enforcement Phase 16) |
| Package security | ⚠️ Phase 17A (manifests added; authority verification Phase 17B) |
| Build/deployment security | ⚠️ Partial (--production mode; full suite Phase 17B) |

---

## See Also

- `logicn-pii-handling.md` — boundary data lifecycle
- `logicn-static-capability-proofs.md` — compile-time capability verification
- `logicn-governed-request-execution.md` — request-level security
- `logicn-javascript-escape-hatch.md` — no ambient JS authority
- `logicn-stage-b-root-capability-provider.md` — compiler authority isolation
- `capability-registry.yaml` — effect → capability mapping
- `logicn-flow-entry-points.md` — routes as only external entry points
