# LogicN Package Use Registry

This document describes the proposed **Package Use Registry** model for **LogicN /
LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and
accelerator-aware programming language concept.

The Package Use Registry gives LogicN one controlled place to approve, configure
and secure third-party packages before they are used by application code.

Status: Draft. This syntax is not parsed or enforced by the v0.1 prototype yet.

The Package Use Registry is backed by the governed Package Resolver. The
registry describes approved package use; the resolver finds, verifies, loads and
links approved packages/modules before execution. The resolver is not an
autoloader and must not silently load files because source references them.

For external package sources, the Certified Package Registry sits before the
Package Resolver. It publishes package evidence such as publisher, signature,
approved version, capabilities, effects, risk rating, security review status and
certification level. The Package Use Registry still controls whether a project
uses that package, and the resolver still verifies and links it.

---

## Summary

LogicN should distinguish between:

```text
import = import a local LogicN file or module
use    = use an approved package, standard library module or third-party dependency
```

This keeps the language clear.

```LogicN
import "./types.lln"
import "./routes.lln"

use GraphQL
use std.json
use std.http
```

Recommended rule:

```text
Import local files.
Use approved packages.
Register packages in boot.lln.
Use packages explicitly in source files.
```

---

## Core Principle

```text
boot.lln owns package approval.
source files use approved packages.
import remains for local LogicN files.
the compiler owns dependency checking and reporting.
```

This keeps developer code readable while still giving LogicN strong security and
memory control.

Resolver rule:

```text
Imports are not trust.
Packages must be resolved, verified and governed before use.
```

## LogicN Workspace Packages

The workspace contains first-party LogicN packages that should be referenced by
package name and updated in their owning docs:

```text
logicn-core              = language syntax, compiler contracts and core safety rules
logicn-core-compiler          = compiler pipeline contracts
logicn-core-runtime           = checked and compiled LogicN execution contracts
logicn-core-security          = reusable security primitives and security report contracts
logicn-core-config            = project config and environment mode contracts
logicn-core-reports           = shared report schemas, processing reports and writer contracts
logicn-core-logic             = Tri, LogicN, Decision, RiskLevel and Omni logic
logicn-core-vector            = vector, matrix, tensor, lanes, dimensions and numeric operations
logicn-core-compute           = compute planning, capabilities, budgets and target selection
logicn-ai                = generic AI inference contracts and safety policy
logicn-ai-lowbit         = low-bit and ternary AI inference contracts
logicn-ai-agent             = supervised AI agent, tool permission and task group contracts
logicn-ai-neural            = neural model, layer, inference and training contracts
logicn-ai-neuromorphic      = spike, event-signal and spiking model contracts
logicn-core-photonic     = wavelength, phase, amplitude and optical signal concepts
logicn-target-cpu        = CPU target capability and fallback planning
logicn-cpu-kernels       = optimized CPU kernel contracts
logicn-target-native     = future native executable target planning and artifact metadata
logicn-target-wasm       = WebAssembly target planning and output contracts
logicn-target-gpu        = GPU target planning and output contracts
logicn-target-ai-accelerator = NPU, TPU, AI-chip and passive backend profile planning
logicn-target-photonic   = photonic backend and optical I/O target planning
logicn-framework-app-kernel        = secure application/API runtime boundary
logicn-framework-api-server        = built-in HTTP transport package
logicn-core-cli               = developer command-line tooling
logicn-core-tasks             = safe project automation
logicn-tools-benchmark         = benchmark diagnostics and privacy-safe reports
logicn-devtools-project-graph     = project knowledge graph and AI assistant map contracts
```

`logicn-core` owns the package registry syntax and compiler/report contract.
Package-specific semantics belong in the owning package.

---

## Why This Matters

Third-party packages can affect:

```text
security
memory usage
startup time
runtime performance
deployment size
AI understanding
supply-chain risk
licence compliance
build repeatability
```

A central package registry helps LogicN avoid uncontrolled dependency use.

The registry question is not only:

```text
Can this dependency be downloaded?
```

It is also:

```text
Should this dependency be allowed authority in this runtime context?
```

Installed does not mean trusted. Certified does not mean unrestricted.

---

## import vs use

| Keyword | Purpose | Example |
|---|---|---|
| `import` | Import local LogicN source files/modules | `import "./types.lln"` |
| `use` | Use approved packages or standard library modules | `use GraphQL` |
| `use std.*` | Use LogicN standard library modules | `use std.json` |

---

## Example File Structure

```text
my-logicn-app/
|-- boot.lln
`-- src/
    |-- main.lln
    |-- types.lln
    `-- routes/
        `-- graphql.lln
```

---

## Example boot.lln

```LogicN
project "GraphQLDemo"

entry "./src/main.lln"

imports {
  import "./src/types.lln"
  import "./src/routes/graphql.lln"
}

packages {
  use GraphQL from "./vendor/graphql" {
    version "1.4.2"

    permissions {
      network "deny"
      file_read "deny"
      file_write "deny"
      environment "deny"
      native_bindings "deny"
      unsafe "deny"
    }

    security {
      lock_hash "sha256:..."
      audit_required true
      aLOw_transitive_permissions false
    }

    loading {
      mode "lazy"
      share_instance true
    }
  }
}
```

---

## Example Source File

```LogicN
import "../types.lln"

use GraphQL
use std.json

/// @purpose Handles a GraphQL request using an approved package.
/// @input Request
/// @output Result<Response, ApiError>
/// @effects [network.inbound]
secure flow handleGraphQL(req: Request) -> Result<Response, ApiError>
effects [network.inbound] {
  let query: GraphQL.Query = GraphQL.parse(req.body)

  let result = GraphQL.execute(query)

  return JsonResponse(result)
}
```

The source file uses:

```LogicN
import "../types.lln"
```

for local files.

It uses:

```LogicN
use GraphQL
```

for an approved package.

---

## Package Approval Rule

```text
A source file may only use external packages that are registered in boot.lln.
```

Valid:

```LogicN
use GraphQL
```

if `GraphQL` is registered in:

```LogicN
packages {
  use GraphQL from "./vendor/graphql" {
    ...
  }
}
```

Invalid:

```LogicN
use RandomUnknownPackage
```

Expected compiler error:

```text
Use error:
RandomUnknownPackage is not registered in boot.lln.

Original source:
  src/routes/example.lln:1:1

Suggestion:
  Add the package to the packages registry in boot.lln with version, permissions and loading rules.
```

---

## Parser and Checker Support

The compiler should parse package approval and file-level usage separately.

Parser support:

```text
parse boot.lln packages blocks
parse package aliases and source locations
parse version declarations
parse permissions blocks
parse security blocks
parse lock_hash values
parse loading modes
parse source-file use statements
```

Checker support:

```text
reject unregistered package use
warn for registered packages that are never used
reject permissions broader than project policy
reject missing lock_hash in strict/release builds
reject native bindings unless explicitly trusted and audited
emit package use report entries
emit security report entries
```

This keeps parser behaviour, package approval checks and package reporting in one auditable model.

---

## Explicit File-Level Use

LogicN should avoid magic global package access.

Bad model:

```text
Package is registered in boot.lln.
Package is automatically available in every source file.
```

Better model:

```text
Package is registered in boot.lln.
Each file uses the package explicitly.
```

Reason:

```text
developers can see dependencies
AI can understand file-level usage
compiler can track package effects
security reports can show usage
memory reports can show loading behaviour
unused packages can be detected
```

Recommended model:

```text
registered globally = approved for use
used explicitly = required by this file
```

---

## Standard Library Use

LogicN standard library modules should also use `use`.

```LogicN
use std.json
use std.http
use std.crypto
use std.env
```

This makes standard library usage clear and consistent.

---

## Local File Imports

Local LogicN files should use `import`.

```LogicN
import "./types.lln"
import "./services/order-service.lln"
import "./routes/orders.lln"
```

`import` should not be used for third-party packages.

---

## Package Version

Every third-party package should declare a version.

```LogicN
packages {
  use GraphQL from "./vendor/graphql" {
    version "1.4.2"
  }
}
```

This supports:

```text
repeatable builds
dependency audits
security checks
AI guide summaries
build manifests
```

---

## Package Lock Hash

A package may declare a lock hash.

```LogicN
security {
  lock_hash "sha256:..."
}
```

This helps detect supply-chain changes.

If the package content does not match the lock hash, LogicN should fail or warn
depending on project policy.

---

## Package Permissions

Packages should declare the permissions they are aLOwed to use.

```LogicN
permissions {
  network "deny"
  file_read "deny"
  file_write "deny"
  environment "deny"
  native_bindings "deny"
  unsafe "deny"
}
```

A GraphQL parser should not normally need:

```text
network access
file writes
environment access
native bindings
unsafe code
```

If a package requests risky permissions, LogicN should report it.

Permission error example:

```text
Package security warning:
GraphQL requested environment access, but boot.lln denies it.

Declared:
  boot.lln:18:7

Suggestion:
  Keep environment access denied unless this package genuinely requires it.
```

---

## Memory Management

Packages should have loading rules.

```LogicN
loading {
  mode "lazy"
  share_instance true
}
```

Meaning:

```text
load package only when first used
reuse one shared package instance
avoid duplicate package memory
track package memory use
```

---

## Loading Modes

Recommended loading modes:

```text
lazy
eager
compile
external
```

### lazy

Load when first used. Good for most packages.

```LogicN
loading {
  mode "lazy"
}
```

### eager

Load at startup. Good for core packages needed immediately.

```LogicN
loading {
  mode "eager"
}
```

### compile

Compile/link into the build if supported. Good for production builds where
dependency contents are known.

```LogicN
loading {
  mode "compile"
}
```

### external

Use an external runtime package. Useful where the package is provided by the
environment.

```LogicN
loading {
  mode "external"
}
```

---

## Shared Instance

For memory management, LogicN should avoid loading the same package multiple times.

```LogicN
loading {
  share_instance true
}
```

Meaning:

```text
one approved package instance
many source files can use it
no duplicate runtime package copies
```

---

## Package Use Report

LogicN should generate package reports.

```json
{
  "packages": [
    {
      "name": "./vendor/graphql",
      "alias": "GraphQL",
      "version": "1.4.2",
      "loading": "lazy",
      "sharedInstance": true,
      "permissions": {
        "network": "deny",
        "fileRead": "deny",
        "fileWrite": "deny",
        "environment": "deny",
        "nativeBindings": "deny",
        "unsafe": "deny"
      },
      "usedBy": [
        "src/routes/graphql.lln"
      ],
      "status": "approved"
    }
  ]
}
```

This should feed into:

```text
app.security-report.json
app.ai-guide.md
app.map-manifest.json
app.build-manifest.json
```

---

## Security Report Integration

The security report should include:

```text
registered packages
versions
permissions
native binding use
unsafe use
environment access
file access
network access
lock hash status
transitive permission status
```

Example:

```json
{
  "packageSecurity": {
    "status": "ok",
    "packages": [
      {
        "alias": "GraphQL",
        "version": "1.4.2",
        "lockHashValid": true,
        "unsafe": "deny",
        "nativeBindings": "deny",
        "environment": "deny"
      }
    ]
  }
}
```

---

## AI Guide Integration

The AI guide should explain package use.

```markdown
## Packages

### GraphQL

Source package:
`thirdparty/graphql`

Version:
`1.4.2`

Loading:
lazy, shared instance

Permissions:
- network: denied
- file read: denied
- file write: denied
- environment: denied
- native bindings: denied
- unsafe: denied

Used by:
- `src/routes/graphql.lln`
```

This helps AI assistants understand dependencies without scanning the whole
project.

---

## Build Manifest Integration

The build manifest should include package versions and hashes.

```json
{
  "dependencies": [
    {
      "alias": "GraphQL",
      "package": "./vendor/graphql",
      "version": "1.4.2",
      "hash": "sha256:..."
    }
  ]
}
```

This helps repeatable builds and deployment verification.

---

## Map Manifest Integration

The map manifest should connect packages to source usage.

```json
{
  "packageUsage": [
    {
      "alias": "GraphQL",
      "registered": "boot.lln:12",
      "usedBy": [
        "src/routes/graphql.lln:1"
      ]
    }
  ]
}
```

---

## Diagnostics

If a package is registered but never used, LogicN should warn.

```text
Package warning:
GraphQL is registered in boot.lln but never used.

Declared:
  boot.lln:12:3

Suggestion:
  Remove the package registration or use it explicitly with `use GraphQL`.
```

If a source file uses a package that is not registered:

```LogicN
use Payments
```

LogicN should report:

```text
Use error:
Payments is not registered in boot.lln.

Original source:
  src/payments/payment-service.lln:1:1

Suggestion:
  Register Payments in boot.lln under packages.
```

---

## Dependency Rule

```text
LogicN packages must be declared before they are used.
```

This makes dependency behaviour:

```text
auditable
repeatable
AI-readable
secure by default
```

---

## Recommended Syntax Summary

Local files:

```LogicN
import "./types.lln"
import "./routes/orders.lln"
```

Standard library:

```LogicN
use std.json
use std.http
use std.crypto
```

Third-party package registration:

```LogicN
packages {
  use GraphQL from "./vendor/graphql" {
    version "1.4.2"

    permissions {
      network "deny"
      file_read "deny"
      file_write "deny"
      environment "deny"
      native_bindings "deny"
      unsafe "deny"
    }

    loading {
      mode "lazy"
      share_instance true
    }
  }
}
```

Third-party package usage:

```LogicN
use GraphQL
```

---

## Non-Goals

The Package Use Registry should not:

```text
make every package globally available automatically
allow unregistered third-party packages
hide package permissions
hide package memory use
allow unsafe native bindings silently
allow packages to read secrets by default
make local file imports and package usage ambiguous
```

---

## Open Questions

```text
Should standard library modules need registration in boot.lln?
Should third-party packages require lock_hash in production?
Should packages be aLOwed to request permissions themselves?
Should transitive dependencies be listed in the report?
Should package loading be lazy by default?
Should package memory use be reported at runtime?
Should unused package registrations fail production builds?
```

---

## Recommended Early Version

Version 0.1:

```text
define import for local files
define use for packages
define packages registry in boot.lln
require source files to use registered packages explicitly
```

Version 0.2:

```text
add package permissions
add unused package warnings
add unregistered use errors
add package security report
```

Version 0.3:

```text
add lock hashes
add loading modes
add shared instance reporting
add AI guide package summary
```

---

## Final Principle

LogicN should make dependencies clear, safe and memory-aware.

Final rule:

```text
Import files.
Use packages.
Register packages once.
Use them explicitly where needed.
Load lazily and share safely.
Report permissions and memory behaviour.
```
