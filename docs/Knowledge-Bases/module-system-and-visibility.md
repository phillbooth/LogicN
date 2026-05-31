# Module System and Visibility

## Definition

The LogicN module system organises code into reusable, isolated, and composable
units. All module resolution is performed statically during compilation.

Runtime dynamic module loading is not part of the core module model.

## Design Principles

```text
Deterministic resolution    — same source tree always resolves identically
Explicit dependencies       — no implicit global imports
Stable namespaces           — public APIs hide implementation details
Compile-time verification   — all imports validated before execution
```

## Module Structure

Each `.lln` file is a module. Directory hierarchy maps to module hierarchy.

```text
math/vector.lln  →  module path: math.vector
```

## Import Syntax

### Full Module Import

```logicn
import math.vector
```

Access through qualification:

```logicn
let v = math.vector::Vector { x: 1, y: 2 }
```

### Selective Symbol Import

```logicn
import math.vector::{Vector, normalize}
```

Only specified symbols enter local scope.

### Aliased Import

```logicn
import collections.long_module_name as list
```

Provides shorter or conflict-free names. Access as `list::create()`.

### Nested Import

```logicn
import graphics.render.pipeline
```

Modules may be nested arbitrarily.

### Relative Imports

```logicn
import ./helpers
import ../shared/types
```

Resolved relative to the current module file. Relative imports must not escape
package boundaries.

### Standard Library Imports

```logicn
import std.io
import std.collections
```

Standard library modules are explicit imports. No implicit preloaded namespaces.

## Re-Exports

Modules may re-export symbols from dependencies:

```logicn
// math/mod.lln
public import math.vector::{Vector}
public import math.matrix::{Matrix}
```

Consumers can then:

```logicn
import math::{Vector, Matrix}
```

## Package Imports

```logicn
import crypto.hash
```

Resolution order:

```text
1. Relative modules
2. Current package modules
3. Workspace packages
4. Explicit external dependencies
5. Standard library
```

Package manifest example:

```toml
[dependencies]
crypto = "1.2.0"
network = "2.0.1"
```

## Module Resolution Algorithm

The compiler:

```text
- resolves module paths
- validates package existence
- detects duplicate symbols
- validates visibility
- builds dependency graphs
- detects cycles
- produces deterministic resolution output
```

## Cyclic Dependency Detection

The compiler detects and rejects cyclic imports.

```text
A imports B
B imports C
C imports A
```

Cycles complicate initialisation ordering, type resolution, and build
determinism. The recommended fix is to extract shared contracts into
independent modules.

Example diagnostic:

```text
LLN-E3007: cyclic module dependency

Module `auth.session` depends on `auth.user`.
Module `auth.user` depends on `auth.session`.
```

## Module Initialisation

Module initialisation order is deterministic, following dependency order.

Initialisation code should avoid:

```text
hidden side effects
runtime-dependent behaviour
network access
non-deterministic compile-time state
```

---

## Visibility

### Private by Default

All symbols are private unless explicitly exported.

```logicn
fn internal_helper() {
    // only accessible within this module
}
```

### Public Symbols

Use `public` to expose a symbol outside the current module.

```logicn
public fn add(a: Int, b: Int) -> Int {
    a + b
}
```

### Public Struct with Private Fields

```logicn
public struct User {
    public username: String
    private password_hash: String
}
```

Field visibility protects internal invariants and security-sensitive data.

### Module-Level Selective Visibility

```logicn
public fn parse() {}
fn tokenize() {}
```

`parse()` is exported. `tokenize()` remains internal.

### Package Visibility

```logicn
package fn validate_token() {}
```

Accessible within the same package but not externally.

### Visibility and Imports

Only public symbols may be imported externally.

```logicn
// auth.lln
private fn hash_password() {}
public fn login() {}

// app.lln
import auth::{login}         // valid
import auth::{hash_password} // compiler error: LLN-E3004
```

### Visibility vs Authority

Visibility controls accessibility.

Capability systems control authority.

A public function still requires runtime capability approval:

```logicn
public fn send_request() effects(network.connect) { ... }
```

---

## Compiler Error Codes

```text
LLN-E3001 unresolved import
LLN-E3002 duplicate symbol
LLN-E3003 invalid package reference
LLN-E3004 visibility violation
LLN-E3005 ambiguous import
LLN-E3006 invalid relative import
LLN-E3007 cyclic dependency
LLN-E3008 inaccessible package symbol
LLN-E3009 invalid visibility modifier
LLN-E3010 private field access
```

## Recommended Practices

```text
Keep APIs minimal
Export stable contracts only
Hide implementation details
Avoid broad public surfaces
Prefer explicit re-exports
Separate trusted/internal APIs from public APIs
```

---

## Module Declaration

A file may declare its module name explicitly.

```logicn
module app/users/service
```

The declared name must match the package manifest and source location.

```text
File path:    app/src/users/service.lln
Module path:  app/users/service
```

If the declaration and path disagree, the compiler emits:

```text
LLN-MODULE-001: module declaration does not match source location
file: app/src/users/service.lln
found: app/payments/service
expected: app/users/service
```

---

## Import Syntax Variants

The module system supports multiple import forms depending on scope.

### Named Imports (Preferred)

```logicn
import { UserId, UserProfile } from "app/users/types"
import { find_user } from "app/users/repository"
```

Named imports make every dependency explicit and are the easiest to audit.

### Type-Only Imports

```logicn
import type { UserRecord } from "app/users/types"
```

Type-only imports signal that no executable code is required at runtime from
that import — only type information. This improves runtime planning.

### Capability Imports

```logicn
import capability { Database } from "logicn-core-data/database"
import capability { HttpClient } from "logicn-core-network/http"
```

Capability imports make the capability type visible for use in function
signatures. They do not grant capability authority — the runtime still decides
whether an instance is issued.

```logicn
flow get_profile(
    db: Database,
    id: UserId
) -> GetProfileResult
contract {
  types {
    type GetProfileResult = Result<UserProfile, UserError>
  }
  effects {
    storage
  }
}
{
    find_user(db, id)
}
```

### Namespace Imports

```logicn
import * as Users from "app/users/service"

flow run(id: Users.UserId) -> RunResult
contract {
  types {
    type RunResult = Result<Users.UserProfile, Users.UserError>
  }
}
{
    Users.get_profile(id)
}
```

Namespace imports are allowed for cohesive modules but named imports are
preferred for clarity and auditability.

### Wildcard Symbol Imports — Disallowed

```logicn
import * from "app/users/service"   // NOT ALLOWED
```

Wildcard symbol imports dump every exported symbol into local scope. They are
disallowed because they:

```text
Hide where names come from
Increase AI misunderstanding risk
Weaken audit reports
Create accidental symbol collisions
Make refactoring less safe
```

---

## Extended Visibility Model

### Visibility Levels

| Keyword | Scope | Importable externally | Typical use |
| ------- | ----- | --------------------- | ----------- |
| `private` (default) | Current module only | No | helpers, internal records |
| no keyword | Same as `private` | No | default for safety |
| `package` | Same package only | Within package | package internals |
| `public` / `pub` | Public module API | Yes | stable types, contracts |
| `runtime` | Runtime-owned | Only if authorised | runtime hooks, descriptors |

`pub` is a shorthand for `public`. Both are valid:

```logicn
pub fn add(a: Int, b: Int) -> Int { a + b }
public fn add(a: Int, b: Int) -> Int { a + b }
```

### Runtime Visibility

`runtime` is reserved for compiler-generated or runtime-privileged code:

```logicn
runtime fn __runtime_register_module() -> ModuleDescriptor {
    module_descriptor()
}
```

Application code should not normally define `runtime` symbols unless the
package manifest explicitly permits it.

### Public API Safety

A public function must not expose private or package-only types in its
return type or parameters:

```logicn
private type SecretToken = String

pub fn export_token() -> SecretToken { ... }
// LLN-VIS-003: public function exposes private return type
```

Correct approach — expose a safe wrapper type:

```logicn
public enum TokenStatus { Present, Missing }

pub fn token_status() -> TokenStatus { ... }
```

---

## Export Rules

Visibility is declared directly on the symbol, not in a separate export block.

Preferred:

```logicn
public fn parse() {}
fn tokenize() {}         // private by default
```

Avoid:

```logicn
export { parse }         // not the LogicN model
```

The compiler generates an export map for tooling:

```json
{
  "module": "app/users/service",
  "public": ["get_profile"],
  "package": [],
  "private": ["to_profile"],
  "runtime": []
}
```

---

## Runtime Loading Rules

The runtime loads modules using a compiler-produced module graph, not by
scanning the filesystem. Each module is represented as a descriptor:

```json
{
  "module": "app/users/service",
  "package": "app-users",
  "hash": "sha256:example",
  "visibility": {
    "public": ["get_profile"],
    "package": [],
    "private": ["to_profile"]
  },
  "imports": [
    "app/users/types",
    "app/users/repository",
    "logicn-core-data/database"
  ],
  "effects": ["storage"],
  "capabilities": ["Database"]
}
```

The runtime rejects a module when:

```text
the module hash does not match the compiled graph
the module requests undeclared capabilities
the module imports a denied package
the module exposes symbols not listed by the compiler
the module requires effects not approved by policy
```

---

## Package Manifest Integration

Each package declares its module roots, public entrypoints, and allowed imports:

```json
{
  "name": "app-users",
  "moduleRoot": "app/src/users",
  "modulePrefix": "app/users",
  "publicModules": [
    "app/users/types",
    "app/users/service",
    "app/users/routes"
  ],
  "privateModules": [
    "app/users/repository"
  ],
  "allowedImports": [
    "logicn-core/result",
    "logicn-core-data/database",
    "logicn-core-network/http"
  ]
}
```

The compiler validates:

```text
module path exists
module declaration matches file location
imports are inside allowed package graph
private modules are not imported from outside the package
public modules do not expose private types
```

---

## Import Ordering Convention

Recommended order within a file:

```text
1. Standard LogicN core imports
2. Capability imports
3. External package imports
4. Application package imports
5. Type-only imports (if kept separate by formatter)
```

Example:

```logicn
import { Result } from "logicn-core/result"
import capability { Database } from "logicn-core-data/database"
import capability { HttpClient } from "logicn-core-network/http"
import { UserId, UserProfile } from "app/users/types"
import type { UserRecord } from "app/users/types"
```

The formatter may group and sort imports automatically.

---

## Extended Compiler Error Codes

Module system diagnostics:

```text
LLN-MODULE-001  module declaration does not match source location
LLN-MODULE-002  import path escapes package boundary
LLN-MODULE-003  circular import detected
LLN-MODULE-004  imported module not found
LLN-MODULE-005  import not listed in package policy
LLN-MODULE-006  wildcard symbol import not allowed
LLN-VIS-001     cannot import private symbol
LLN-VIS-002     cannot import package-visible symbol from outside package
LLN-VIS-003     public function exposes private return type
LLN-VIS-004     public module exports non-public dependency type
LLN-VIS-005     runtime-only symbol used by application code
LLN-CAP-001     imported function requires ungranted capability
LLN-CAP-002     imported module declares denied effect
```

See also the `LLN-E3xxx` series in the compiler diagnostics for earlier
prototype codes.

---

## Imports and Authority

Importing a module makes its symbols visible. It does not grant authority.

```logicn
import { read_config } from "app/config/reader"

flow boot() -> BootResult
contract {
  types {
    type BootResult = Result<AppConfig, ConfigError>
  }
}
{
    read_config()
}
```

The import only brings `read_config` into scope. It does not grant filesystem
access. The compiler and runtime still verify the capability requirements
declared by the imported function.

```text
Visibility  → controlled by import / public / private / package
Authority   → controlled by capability declarations and runtime policy
```

---

## Future Extensions

```text
Version-scoped imports
Lazy module loading
Optional dependencies
Feature-gated imports
Sandboxed plugin modules
```

These remain future extensions rather than core requirements.
