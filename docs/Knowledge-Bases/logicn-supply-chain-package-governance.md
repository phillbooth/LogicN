# LogicN Supply Chain Attestation and Package Governance

## Overview

Two closely related features protect the LogicN package ecosystem:

1. **Supply-chain attestation** — every resolved dependency is pinned by content
   hash; hash drift fails the build with `LLN-SUPPLY-001`
2. **Package governance manifests** — every published package declares its
   effects, capabilities, resource requirements, secrets and diagnostic ranges
   before installation

Together, these turn dependency installation into a governed, auditable event
rather than a blind download.

---

## Part 1: Supply-Chain Attestation

### Why Hash Pinning

A package import is external authority entering the build. Content hashes
ensure that:

```text
name + version + source + resolved version + content hash + permissions
```

is the identity — not just `name + latest compatible version`.

Hash pinning prevents:
```text
registry substitution, tampered tarballs, compromised mirrors, unexpected
rebuild differences, mutable tags, dependency confusion, lockfile drift,
transitive dependency replacement, CI/local mismatch
```

### Lockfile Shape

```json
{
  "packages": {
    "logicn-http@1.4.2": {
      "source": "registry.logicn.dev",
      "integrity": "sha256-9b7a...",
      "signatures": [{ "issuer": "logicn-registry", "signature": "sigstore:..." }],
      "permissions": {
        "network.outbound": true,
        "file.write": false,
        "native": false,
        "unsafe": false
      }
    }
  }
}
```

### Build Behaviour

Production builds must run in locked mode:

```bash
logicn build --locked
```

```text
do not resolve new versions
do not rewrite the lockfile
fail on missing hash
fail on hash mismatch (LLN-SUPPLY-001)
fail on unsigned package if policy requires signatures
fail on permission drift (LLN-SUPPLY-002)
```

### Hash is Necessary but Not Sufficient

```text
content hash   = integrity (bytes did not change)
signatures     = identity (publisher is who we think)
provenance     = origin/build path
permissions    = authority
reports        = auditability
```

A hash tells you the bytes did not change. It does not prove the bytes are safe.

### Diagnostics

| Code | Meaning |
|---|---|
| `LLN-SUPPLY-001` | Dependency content hash mismatch |
| `LLN-SUPPLY-002` | Dependency permission set changed since last lockfile update |

Example:

```text
LLN-SUPPLY-001: dependency content hash mismatch

Import:      logicn-http@1.4.2
Expected:    sha256:9b7a...
Actual:      sha256:31fd...
Source:      registry.logicn.dev

Resolution:
  Build stopped. The dependency content changed without an approved lockfile update.
  Run `logicn package review logicn-http@1.4.2` and update the lockfile only after review.
```

---

## Part 2: Package Governance Manifests

### What a Governance Manifest Contains

```json
{
  "name": "@logicn/payments",
  "version": "1.4.0",
  "logicnPackageVersion": "1",
  "exports": {
    "./charge": {
      "effects": ["network.external", "secret.read"],
      "capabilities": ["payment.charge"],
      "resources": ["PaymentProvider"],
      "diagnostics": "LLN-PAYMENTS-1000..1199"
    },
    "./types": { "effects": [], "capabilities": [] }
  },
  "supplyChain": {
    "integrity": "sha256:...",
    "signature": "sigstore:...",
    "provenance": "..."
  }
}
```

### Install-Time Authority Review

```bash
logicn install @logicn/payments
```

Output:

```text
Package:     @logicn/payments@1.4.0

Requested effects:
  network.external
  secret.read

Requested capabilities:
  payment.charge
  payment.refund
  webhook.verify

Secrets:
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET

Supply chain:
  content hash verified
  publisher signature verified

Accept package authority? [y/N]
```

### Permission Diff on Update

If an update changes authority:

```text
LLN-SUPPLY-002: dependency permission set changed

Package:    @logicn/payments@1.4.3
New effect: file.write

Resolution:
  Review required before lockfile update can be accepted.
```

### Diagnostic Code Ranges

Packages may reserve their own diagnostic range:

```text
LLN-PAYMENTS-1000..1199
```

This avoids collision between packages and allows the LSP to route diagnostics
to package-specific documentation.

Suggested core ranges:

```text
LLN-CORE-0000..0999      core language
LLN-TYPE-1000..1999      type system
LLN-EFFECT-2000..2999    effect checker
LLN-SECURITY-3000..3999  security checker
LLN-PACKAGE-4000..4999   package/supply-chain checker
```

### No Install-Time Execution

A LogicN-native module system prohibits executable install hooks:

```text
no preinstall
no install
no postinstall
no prepare scripts
no arbitrary shell execution
```

If code generation is needed, it must declare a sandboxed build step with
explicit capabilities and no network access by default.

---

## Part 3: LogicN-Native Module System (Long-Term)

npm is a reasonable bootstrap and development distribution channel. It is not
the final LogicN package trust model. The long-term module system will:

```text
Stage 1:  npm remains bootstrap distribution
Stage 2:  LogicN packages include governance manifests inside npm package
Stage 3:  logicn install reads governance manifests and validates lockfile
Stage 4:  optional LogicN-native registry mirrors packages by content hash
Stage 5:  production builds can use LogicN-native package store without npm
Stage 6:  npm becomes only a compatibility/bootstrap channel
```

The LogicN-native module system will be content-addressed:

```text
.logicn/store/sha256/ab/cd/...
logicn.lock.json
```

---

## Architecture Placement

| Layer | Responsibility |
|---|---|
| `logicn-core` | Import syntax, dependency identity rules, governance manifest contract |
| `logicn-core-compiler` | Import resolution and hash checks before type checking/codegen |
| `logicn-core-config` | Dependency policy, production profile rules |
| `logicn-core-security` | Package permission model, unsafe/native policy |
| `logicn-core-reports` | Dependency graph reports, integrity reports, security reports |
| `logicn-core-cli` | Lockfile generation, verification, update, review commands |
| `logicn-devtools-project-graph` | Graph-level visibility for packages, reports and policies |

---

## CLI Commands

```bash
logicn package install @logicn/payments
logicn package verify
logicn package review @logicn/payments@1.4.2
logicn package update @logicn/payments --review
logicn package explain @logicn/payments
logicn package diff @logicn/payments@1.4.0 @logicn/payments@1.5.0
logicn package audit
logicn build --locked
```
