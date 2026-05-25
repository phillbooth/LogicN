# Effect Checker and Boundary Checker

## Definition

The effect checker and boundary checker are two complementary compiler
components that enforce what code may do and where it is allowed to do it.

| Component        | Question Answered                     |
| ---------------- | ------------------------------------- |
| Effect checker   | What does this code do?               |
| Boundary checker | Is this code allowed to do that here? |

They work together:

```text
Effect checker     → identifies what effects code performs
Boundary checker   → validates whether those effects are allowed here
```

## Status

```text
Planned / Not yet implemented.
Effect and boundary validation are part of the intended compiler safety model
but are not yet enforced by the current compiler prototype.
```

---

## Effect Checker

### Purpose

The effect checker determines which side effects a piece of code may perform.

Effects describe interactions beyond pure computation:

```text
fs.read               — reading files
fs.write              — writing files
network.connect       — opening network connections
env.read              — accessing environment variables
secret.read           — reading secrets
time.read             — accessing system clocks
random.read           — generating randomness
runtime.log           — logging or emitting telemetry
runtime.audit         — emitting audit events
process.spawn         — spawning processes
database.read         — database read operations
database.write        — database write operations
```

### Why It Matters

Without an effect checker the compiler cannot reliably answer:

```text
Is this function pure?
Can this module access the network?
Is this code allowed to read secrets?
Can this code run at compile time?
Is this dependency introducing undeclared runtime authority?
```

### Expected Behaviour

Functions declare their effects in the signature:

```logicn
flow loadConfig(path: String) -> String
effects [fs.read] {
    fs.read(path)
}
```

If a function performs an undeclared effect, the compiler rejects it:

```logicn
flow loadConfig(path: String) -> String {
    fs.read(path)
}
// LLN-E4001: undeclared effect
// Function `loadConfig` performs effect `fs.read` but does not declare it.
```

### Effect Propagation

Effects propagate through the call graph.

```logicn
flow readUser() -> String effects [fs.read] {
    fs.read("user.json")
}

flow start() {
    readUser()
}
// LLN-E4002: undeclared propagated effect
// `start` indirectly performs `fs.read` via `readUser`
```

Corrected:

```logicn
flow start() effects [fs.read] {
    readUser()
}
```

### Compile-Time Restrictions

Compile-time code must be deterministic. The effect checker must reject
compile-time code that attempts runtime-only effects:

```logicn
const config = fs.read("local.env")
// LLN-E4003: forbidden compile-time effect
// Compile-time expression attempted fs.read
```

### Effect Syntax

Recommended syntax (v0.1 design):

```logicn
fn name(args) -> ReturnType effect effect_name {
    ...
}
```

Multiple effects:

```logicn
fn name(args) -> ReturnType effect network, storage {
    ...
}
```

No effect declaration means pure or locally bounded code:

```logicn
fn add(a: Int, b: Int) -> Int {
    return a + b
}
```

The older `effects [fs.read]` bracket form is equivalent in concept;
the canonical documented form uses `effect network, storage` (no brackets).

### Example: Pure Function

```logicn
pub fn normalise_name(name: Text) -> Text {
    return name.trim().lowercase()
}
```

Compiler result: no effects, pure function, no capability required.

### Example: Effectful Function

```logicn
pub fn load_profile(http: HttpClient, id: UserId)
    -> Result<UserProfile, NetworkError>
    effect network
{
    return http.get("/users/" + id)
}
```

Effect checker validates that `http.get` requires `network` and the
function declares it.

### Effect Checker Algorithm (Pseudo-code)

```text
for each function in module:
    collect_required_effects(function.body)    ← walk AST
    declared = function.effect_declarations
    required = inferred_from_body + propagated_from_callees

    for each effect in required:
        if effect not in declared:
            emit LN-EFFECT-001 (undeclared effect)

    for each effect in declared:
        if effect not in required:
            emit LN-EFFECT-004 (declared but never used — warning)
```

### Checker Output

```json
{
  "function": "load_profile",
  "declared_effects": ["network"],
  "inferred_effects": ["network"],
  "result": "pass"
}
```

### Initial Effect Categories (Full Table)

| Effect | Meaning | Example |
| --- | --- | --- |
| `network` | Sends or receives network traffic | HTTP request, socket |
| `storage` | Reads or writes durable storage | database query |
| `filesystem` | Reads or writes files | config file read |
| `secret` | Reads protected secrets | API key access |
| `process` | Starts or controls processes | shell command |
| `timer` | Uses time-based waiting | timeout, delay |
| `scheduler` | Registers future work | scheduled action |
| `trigger` | Responds to runtime event | event listener |
| `crypto` | Performs sensitive cryptographic action | signing, verification |
| `accelerator` | Uses GPU or AI accelerator | tensor operation |
| `optical_io` | Uses future optical transport planning | interconnect planning |
| `audit` | Writes audit evidence | runtime audit record |

Pure (no declaration) means no external effects beyond local computation.

Not every effect needs to be implemented in v0.1, but the checker must be
designed so new effects can be added without redesigning the language.

---

## Boundary Checker

### Purpose

The boundary checker validates whether code crosses architectural, trust,
package, runtime, or authority boundaries correctly.

Boundary types:

```text
Module boundaries              — public/private symbol access
Package boundaries             — package API contracts
Compile-time/runtime boundary  — forbidden runtime operations during compilation
Trust boundaries               — untrusted dependencies and sensitive authority
Capability boundaries          — declared vs undeclared capabilities
Deployment boundaries          — environment-specific restrictions
```

### Why It Matters

Without a boundary checker the compiler cannot enforce:

```text
Encapsulation
Capability isolation
Runtime authority limits
Compile-time determinism
Safe package APIs
Trusted versus untrusted dependency separation
```

The boundary checker works alongside the effect checker.
The effect checker determines what an operation does.
The boundary checker determines whether that operation is allowed here.

### Example: Visibility Boundary

```logicn
// auth.lln
private flow hashPassword(password: String) -> String { ... }
public flow login(username: String, password: String) -> Bool { ... }

// app.lln
import auth::{hashPassword}
// LLN-E3004: visibility boundary violation
// Symbol `hashPassword` is private to module `auth`
```

### Example: Compile-Time / Runtime Boundary

```logicn
compile flow generateSchema() {
    network.fetch("https://example.com/schema")
}
// LLN-E4004: compile-time/runtime boundary violation
// Compile-time function attempted runtime-only operation `network.fetch`
```

### Example: Package Trust Boundary

Untrusted dependencies must not inherit sensitive authority:

```toml
[dependencies.parser-lib]
trust = "external"
capabilities = []
```

If `parser-lib` attempts to access secrets, the compiler rejects the build.

### Boundary Types (Full Table)

| Boundary | What It Prevents |
| --- | --- |
| Module visibility | Private symbol accessed from outside module |
| Package contract | Package internal API exposed to external consumers |
| Compile-time / runtime | Runtime effect attempted at compile time |
| Trust | Untrusted dependency inheriting sensitive authority |
| Secret / data | Secret type escapes into public API or audit log |
| Filesystem | Unrestricted file access outside declared paths |
| Network / API | Undeclared outbound connections or internal record leakage |
| Capability | Capability used without being granted or declared |
| Deployment | Environment-specific policy restrictions violated |

### Boundary Violation Examples

**Module visibility violation:**

```logicn
// auth.ln
private fn hash_password(pw: String) -> String { ... }
public fn login(u: String, pw: String) -> Bool { ... }

// app.ln
import auth::{hash_password}
// LN-BOUNDARY-004: private symbol `hash_password` not visible outside `auth`
```

**Package contract violation:**

```logicn
import app/users/repository/internal/raw_sql
// LN-BOUNDARY-001: import crosses restricted package boundary
// `internal/raw_sql` is not part of `app/users/repository` public API
```

**Compile-time / runtime boundary:**

```logicn
compile fn generate_schema() {
    network.fetch("https://example.com/schema")
}
// LN-BOUNDARY-003: compile-time function attempted runtime-only operation
// Also: LLN-E4004 (compile-time/runtime boundary violation)
```

**Secret leakage:**

```logicn
pub fn get_config() -> Config {
    return Config { api_key: secret.read("PAYMENT_KEY") }
}
// LN-BOUNDARY-006: secret type escaping into public API
```

**Capability violation:**

```logicn
fn run_shell() effect process {
    shell.exec("rm -rf /")
}
// LN-BOUNDARY-007: capability `ShellExec` not declared for this module
```

### Implementation Scope

The first boundary checker must define:

```text
Boundary types and metadata representation
Rules for module/package access
Compile-time versus runtime separation enforcement
Trust boundary rules for external dependencies
Capability boundary enforcement
Secret / data leakage detection
Diagnostics for invalid boundary crossings
```

---

## Diagnostic Codes

### Effect Checker Codes (LN-EFFECT series)

| Code | Meaning |
| --- | --- |
| `LN-EFFECT-001` | Function performs undeclared effect |
| `LN-EFFECT-002` | Effect propagated from callee not declared in caller |
| `LN-EFFECT-003` | Compile-time code performs runtime-only effect |
| `LN-EFFECT-004` | Effect declared but never observed (warning) |
| `LN-EFFECT-005` | Unknown effect name used in declaration |

### Boundary Checker Codes (LN-BOUNDARY series)

| Code | Meaning |
| --- | --- |
| `LN-BOUNDARY-001` | Import crosses restricted package boundary |
| `LN-BOUNDARY-002` | Public API exposes private or internal type |
| `LN-BOUNDARY-003` | Runtime operation attempted at compile time |
| `LN-BOUNDARY-004` | Private symbol accessed from outside module |
| `LN-BOUNDARY-005` | Unsafe dependency inherits sensitive authority |
| `LN-BOUNDARY-006` | Secret type escaping into public API or audit log |
| `LN-BOUNDARY-007` | Capability used without being declared |
| `LN-BOUNDARY-008` | Network access outside declared host allowlist |
| `LN-BOUNDARY-009` | Filesystem access outside declared path allowlist |

### Legacy Codes (also in use)

```text
LLN-E4001  undeclared effect
LLN-E4002  undeclared propagated effect
LLN-E4003  forbidden compile-time effect
LLN-E4004  compile-time/runtime boundary violation
LLN-E4005  capability boundary violation
LLN-E4006  package trust boundary violation
```

Both series are in use. `LN-EFFECT-*` and `LN-BOUNDARY-*` are the newer
canonical forms; `LLN-E4*` codes are the earlier equivalents.

## Compiler Internal Structures

### Effect Checker Modules

```text
packages-logicn/logicn-core-compiler/src/effects/
```

Suggested files:

```text
effect-registry.ts
effect-inference.ts
effect-propagation.ts
effect-validator.ts
effect-diagnostics.ts
effect-manifest.ts
```

Core type definitions:

```ts
export type Effect =
    | "network"
    | "storage"
    | "filesystem"
    | "secret"
    | "accelerator"
    | "optical_io"

export interface EffectSet {
    declared: Effect[]
    inferred: Effect[]
    propagated: Effect[]
}
```

AST walk example:

```ts
function collectEffects(node: AstNode): Effect[] {
    const effects: Effect[] = []

    if (node.kind === "NetworkCall") {
        effects.push("network")
    }

    if (node.kind === "FilesystemRead") {
        effects.push("filesystem")
    }

    return effects
}
```

### Boundary Checker Modules

```text
packages-logicn/logicn-core-compiler/src/boundaries/
```

Suggested files:

```text
boundary-validator.ts
package-boundaries.ts
visibility-boundaries.ts
secret-analysis.ts
capability-boundaries.ts
trust-boundaries.ts
boundary-diagnostics.ts
```

Core type definitions:

```ts
export interface BoundaryMetadata {
    trustLevel: "internal" | "external"
    publicApi: boolean
    capabilities: string[]
    effects: string[]
}
```

### Manifest Generator Modules

The manifest generator is pass 14 in the compiler pipeline (after audit metadata
emitter). It aggregates all compiler metadata into a canonical governance
artifact.

```text
packages-logicn/logicn-core-compiler/src/manifests/
```

Suggested files:

```text
manifest-builder.ts
manifest-schema.ts
manifest-hash.ts
manifest-serializer.ts
manifest-validator.ts
```

### RuntimeManifest Type

```ts
export interface RuntimeManifest {
    module: string
    effects: string[]
    capabilities: string[]
    targets: string[]
    trustLevel: string
    auditRequired: boolean
}
```

### Manifest Builder Example

```ts
function buildManifest(
    module: ModuleGraph
): RuntimeManifest {
    return {
        module: module.name,
        effects: module.effects,
        capabilities: module.capabilities,
        targets: module.targets,
        trustLevel: module.trustLevel,
        auditRequired: true
    }
}
```

### Extended Manifest Format

The extended workspace manifest includes multi-module and deployment metadata:

```json
{
  "workspace": "app-main",
  "modules": [
    {
      "name": "app.users.service",
      "effects": ["storage"],
      "capabilities": ["Database"]
    }
  ],
  "deployment": {
    "allowTargets": ["cpu"],
    "denyEffects": ["optical_io"]
  },
  "integrity": {
    "manifestHash": "sha256:manifest",
    "graphHash": "sha256:graph"
  }
}
```

### Manifest Pipeline

```text
AST
    ↓
effect checker
    ↓
boundary checker
    ↓
capability resolver
    ↓
runtime graph builder
    ↓
manifest serializer
    ↓
runtime-manifest.json
```

---

## Manifest Diagnostic Codes (LN-MANIFEST series)

| Code | Meaning |
| --- | --- |
| `LN-MANIFEST-001` | missing runtime manifest |
| `LN-MANIFEST-002` | manifest integrity failure |
| `LN-MANIFEST-003` | unsupported manifest version |
| `LN-MANIFEST-004` | invalid capability reference |
| `LN-MANIFEST-005` | runtime target mismatch |

---

## Implementation Order (16-item checklist)

These two systems are foundational and should be implemented early:

```text
 1. Define effect syntax and effect categories
 2. Implement function-level effect declarations
 3. Implement effect propagation through call graph
 4. Implement compile-time effect restrictions
 5. Define boundary types and metadata representation
 6. Implement module visibility boundary enforcement
 7. Implement package contract boundary enforcement
 8. Implement compile-time / runtime boundary enforcement
 9. Implement package trust boundary enforcement (external deps)
10. Implement secret / data leakage detection
11. Implement network boundary checks (host allowlist)
12. Implement filesystem boundary checks (path allowlist)
13. Implement capability boundary enforcement
14. Add effect checker diagnostics with suggested fixes
15. Add boundary checker diagnostics with suggested fixes
16. Generate runtime manifest including effect and boundary metadata
```

## v0.1 Scope

Implement first (v0.1):

```text
network effect
storage effect
filesystem effect
secret effect
scheduler effect
trigger effect
module visibility boundary
package contract boundary
capability boundary
runtime manifest generation
```

Defer to later:

```text
optical_io effect
accelerator effect
distributed compute effects
advanced network host allowlist
advanced filesystem path allowlist
```

## Runtime Manifest Output

The boundary and effect checkers feed the compiler-generated runtime manifest.
The manifest becomes the governance bridge between compiler, CLI, runtime, and
audit systems.

Example manifest with boundary and effect metadata:

```json
{
  "module": "app.auth",
  "effects": ["network", "secret"],
  "capabilities": ["SecretRead"],
  "network_hosts": ["api.example.com"],
  "filesystem_paths": ["./config"],
  "trust_level": "internal",
  "audit_required": true
}
```

This machine-readable governance layer is consumed by:

```text
compiler          — validates correctness
runtime           — enforces execution authority
logicn deploy     — validates before deployment
logicn explain    — explains what the module does
logicn plan       — estimates compute requirements
security tooling  — audits authority claims
AI tooling        — reads project reasoning
```

---

## Architecture Depth: TypeScript Contracts (v0.2 Specification)

### Effect Interface

```ts
export interface Effect {
  id: string

  /**
   * Human-readable effect name.
   * Example: "network", "database.write"
   */
  name: string

  /**
   * Effect category used for policy grouping.
   */
  category:
    | "network"
    | "database"
    | "filesystem"
    | "shell"
    | "process"
    | "secret"
    | "ai"
    | "gpu"
    | "native"
    | "custom"

  /**
   * Whether this effect is considered unsafe by default.
   */
  unsafe: boolean

  /**
   * Whether this effect may cross trust boundaries.
   */
  boundarySensitive: boolean

  /**
   * Optional capability requirement.
   */
  requiredCapability?: string
}
```

Note: The earlier `Effect` type as a string union is the simplified v0.1 form.
This fuller interface is the v0.2 target for the effect checker.

### CheckedFunction Interface

Every checked function should have effect metadata:

```ts
export interface CheckedFunction {
  id: string
  name: string

  /** Effects explicitly declared in the function signature. */
  declaredEffects: EffectReference[]

  /** Effects inferred from the function body by AST walking. */
  inferredEffects: EffectReference[]

  /**
   * Effective effects = declaredEffects ∪ inferredEffects.
   * This is what the boundary checker validates.
   */
  effectiveEffects: EffectReference[]

  /** Boundary requirements derived from the call context. */
  boundaryRequirements: BoundaryRequirement[]

  diagnostics: CompilerDiagnostic[]
}
```

### EffectGraphNode Interface

```ts
export interface EffectGraphNode {
  functionId: string
  outgoingCalls: string[]
  inferredEffects: EffectReference[]
}
```

### EffectGraph Interface

```ts
export interface EffectGraph {
  nodes: EffectGraphNode[]
  nodeMap: Map<string, EffectGraphNode>
}
```

### inferExpressionEffects() Implementation

```ts
export function inferExpressionEffects(
  expression: CheckedExpression
): EffectReference[] {
  switch (expression.kind) {
    case "HttpCallExpression":
      return [{ name: "network" }]
    case "DatabaseQueryExpression":
      return [{ name: "database.read" }]
    case "DatabaseMutationExpression":
      return [{ name: "database.write" }]
    case "ShellExecExpression":
      return [{ name: "shell.execute" }]
    default:
      return []
  }
}
```

### propagateEffects() Implementation (Iterative Fixpoint)

```ts
export function propagateEffects(
  graph: EffectGraph
): EffectGraph {
  let changed = true

  while (changed) {
    changed = false

    for (const node of graph.nodes) {
      for (const childId of node.outgoingCalls) {
        const child = graph.nodeMap.get(childId)
        if (!child) continue

        for (const effect of child.inferredEffects) {
          if (!containsEffect(node.inferredEffects, effect)) {
            node.inferredEffects.push(effect)
            changed = true
          }
        }
      }
    }
  }

  return graph
}
```

### Boundary Interface (v0.2)

```ts
export interface Boundary {
  id: string

  type:
    | "api"
    | "webhook"
    | "worker"
    | "job"
    | "network"
    | "database"
    | "secret"
    | "ffi"
    | "filesystem"
    | "ai"

  trustLevel:
    | "untrusted"
    | "validated"
    | "internal"
    | "privileged"

  allowedEffects: string[]
  deniedEffects: string[]
  requiredPolicies: BoundaryPolicy[]
}
```

### BoundaryRequirement Interface

```ts
export interface BoundaryRequirement {
  boundaryType: string
  requiresValidation: boolean
  requiresAuth: boolean
  requiresRateLimit: boolean
  requiresReplayProtection: boolean
  requiresSecretProtection: boolean
}
```

### BoundaryEdge Interface

```ts
export interface BoundaryEdge {
  from: string
  to: string
  transferredEffects: string[]
  transferredSecrets: string[]
  requiresValidation: boolean
}
```

### BoundaryGraph Interface

```ts
export interface BoundaryGraph {
  boundaries: BoundaryNode[]
  edges: BoundaryEdge[]
}
```

### Checked IR: CheckedCallExpression

```ts
export interface CheckedCallExpression {
  kind: "CheckedCallExpression"
  targetFunctionId: string
  argumentTypes: CheckedType[]
  inferredEffects: EffectReference[]
  sourceLocation: SourceLocation
}
```

The IR pipeline flows:

```text
AST
  ↓
typed AST
  ↓
checked IR (includes CheckedCallExpression)
  ↓
effect graph
  ↓
boundary graph
  ↓
runtime manifest
```

### Full RuntimeManifest Type (v0.2)

```ts
export interface RuntimeManifest {
  schemaVersion: string
  buildId: string
  generatedAt: string
  target: RuntimeTarget
  routes: RouteManifest[]
  functions: FunctionManifest[]
  effects: EffectManifest[]
  permissions: PermissionManifest[]
  boundaries: BoundaryManifest[]
  reports: ReportManifest[]
  diagnostics: CompilerDiagnostic[]
}
```

The earlier simplified RuntimeManifest (module/effects/capabilities/targets/trustLevel)
is the v0.1 form. The full interface above is the v0.2 target.

### RouteManifest

```ts
export interface RouteManifest {
  id: string
  method: string
  path: string
  requestType?: string
  responseType?: string
  auth?: AuthManifest
  body?: BodyManifest
  limits?: LimitsManifest
  effects: string[]
  boundaries: string[]
  webhook?: WebhookManifest
}
```

### FunctionManifest

```ts
export interface FunctionManifest {
  id: string
  name: string
  declaredEffects: string[]
  inferredEffects: string[]
  transitiveEffects: string[]
  boundaries: string[]
  capabilities: string[]
}
```

### EffectManifest

```ts
export interface EffectManifest {
  name: string
  category: string
  unsafe: boolean
  boundarySensitive: boolean
  requiredCapability?: string
}
```

### BoundaryManifest

```ts
export interface BoundaryManifest {
  id: string
  type: string
  trustLevel: string
  allowedEffects: string[]
  deniedEffects: string[]
  requiredPolicies: string[]
}
```

### BuildManifestInput

```ts
export interface BuildManifestInput {
  checkedProgram: CheckedProgram
  effectGraph: EffectGraph
  boundaryGraph: BoundaryGraph
  compilerOptions: CompilerOptions
}
```

### buildManifest() Implementation

```ts
export function buildManifest(
  input: BuildManifestInput
): RuntimeManifest {
  return {
    schemaVersion: "logicn.runtime.manifest.v1",
    buildId: createBuildId(),
    generatedAt: new Date().toISOString(),
    target: input.compilerOptions.target,
    routes: buildRouteManifests(input),
    functions: buildFunctionManifests(input),
    effects: buildEffectManifests(input),
    permissions: buildPermissionManifests(input),
    boundaries: buildBoundaryManifests(input),
    reports: buildReportManifests(input),
    diagnostics: input.checkedProgram.diagnostics
  }
}
```

### validateManifest()

```ts
export function validateManifest(
  manifest: RuntimeManifest
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = []

  if (!manifest.schemaVersion) {
    diagnostics.push({
      code: "LN-MANIFEST-002",
      severity: "error",
      message: "Manifest schemaVersion is missing."
    })
  }

  return diagnostics
}
```

### Manifest Output Structure

```text
build/
  manifests/
    runtime-manifest.json
    route-manifest.json
    permissions-manifest.json
    effects-manifest.json
    boundary-manifest.json
    openapi.json

  reports/
    compiler-report.json
    effect-report.json
    boundary-report.json
    security-report.json
    runtime-report.json
```

### Effect Checker Architecture

```ts
export function checkApiBoundary(
  route: CheckedRoute
): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = []

  if (!route.requestType) {
    diagnostics.push({
      code: "LN-BOUNDARY-001",
      severity: "error",
      message: "API route requires typed request validation."
    })
  }

  if (containsForbiddenEffect(route.effects, "shell.execute")) {
    diagnostics.push({
      code: "LN-BOUNDARY-003",
      severity: "error",
      message: "shell.execute cannot cross API boundary."
    })
  }

  return diagnostics
}
```

### Updated File Layout (v0.2)

```text
packages-logicn/logicn-core-compiler/src/

  effects/
    effect-types.ts
    effect-inference.ts
    effect-propagation.ts
    effect-graph.ts
    effect-checker.ts
    effect-policy.ts
    effect-diagnostics.ts

  boundaries/
    boundary-types.ts
    boundary-checker.ts
    boundary-policy.ts
    boundary-graph.ts
    boundary-diagnostics.ts

  manifests/
    runtime-manifest.ts
    route-manifest.ts
    effect-manifest.ts
    boundary-manifest.ts
    manifest-builder.ts
    manifest-validator.ts
    manifest-diagnostics.ts

  reports/
    effect-report.ts
    boundary-report.ts
    runtime-report.ts
```

---

## Layered Compute Adapter Model

The compiler's compute planning uses a layered adapter model to remain
vendor-neutral while supporting specific device profiles.

```text
LogicN source
  → compute engine
  → target class adapter
  → device family adapter
  → individual device profile
  → runtime selection
```

Package structure:

```text
logicn-core-compute           — planning contracts and intent
logicn-target-gpu             — generic GPU adapter
logicn-device-nvidia          — CUDA/NVIDIA profile
logicn-device-amd             — ROCm/AMD profile
logicn-device-intel-gaudi     — AI accelerator profile
logicn-device-optical-io      — optical I/O profile
```

Design rule:

```text
Device support must be profile/config/adapter based, not language syntax.
```

```ts
interface ComputeDeviceProfile {
  id: string
  vendor: string
  family: string
  kind: "cpu" | "gpu" | "ai_accelerator" | "optical_io"
  capabilities: string[]
  memoryMb?: number
  supports(effect: string): boolean
}
```

Runtime selection:

```ts
function selectDevice(
  plan: ComputePlan,
  devices: ComputeDeviceProfile[]
): ComputeDeviceProfile {
  return devices.find(device =>
    plan.requiredCapabilities.every(cap =>
      device.capabilities.includes(cap)
    )
  ) ?? cpuFallbackDevice
}
```

Example device profile:

```ts
const gaudi3Profile: ComputeDeviceProfile = {
  id: "intel.gaudi3",
  vendor: "intel",
  family: "gaudi",
  kind: "ai_accelerator",
  capabilities: ["matrix.multiply", "low_precision.inference", "batch.parallel"],
  memoryMb: 128000,
  supports(effect) {
    return !["network", "filesystem.write", "secret.access"].includes(effect)
  }
}
```

Architecture rule:

```text
Core compute decides what is needed.
Target adapter decides what class can run it.
Device profile decides whether this machine can run it.
Runtime chooses safely.
```

---

## Why These Systems Are Foundational

Without effect checking and boundary enforcement:

```text
runtime authority cannot be safely planned
capabilities cannot be reliably scoped
governed execution cannot be trusted
audit metadata becomes incomplete
AI-readable execution reasoning becomes unreliable
```

The effect checker and boundary checker together transform LogicN from a normal
language runtime into a governed execution platform with:

```text
explicit authority
deterministic compilation
runtime governance
trust-aware execution
capability isolation
secure package boundaries
audit-grade execution metadata
AI-readable execution reasoning
```

---

## Relationship to Other Systems

```text
Effect checker     → feeds into runtime capability policies
Boundary checker   → enforces module visibility + trust model
Both               → feed runtime manifests and governed execution plans
Both               → required for `logicn explain` explanations
Both               → required for Omni logic reasoning layer
```

See also: `authority-model.md`, `compile-time-vs-runtime-authority.md`,
`governed-capability-modules.md`, `package-completion-status.md`.
