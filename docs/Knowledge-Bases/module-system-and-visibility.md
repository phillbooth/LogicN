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

## Future Extensions

```text
Version-scoped imports
Capability-aware imports
Lazy module loading
Optional dependencies
Feature-gated imports
Sandboxed plugin modules
```

These remain future extensions rather than core requirements.
