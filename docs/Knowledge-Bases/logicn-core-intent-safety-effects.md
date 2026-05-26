# LogicN Intent, Safety Levels, Effects, and Flow Tracing

**Status:** Stage 1 — type contracts and documentation complete; parser/checker stubs in place  
**Scope:** Developer intent declarations, safety levels, security effects, flow tracing, runtime manifests  
**Packages:** `@logicn/core`, `@logicn/core-compiler`, `@logicn/core-reports`

---

## 1. Core Idea

Most compilers understand syntax. LogicN additionally understands **declared developer intent**:

```text
this flow creates an order         → intent "create customer order"
this function reads a secret       → effects [secret.read]
this route charges money           → safetyLevel: guarded, effects [payment.charge]
this block is unsafe native interop → unsafe block + reason + fallback
this computation is pure           → pure flow + effects []
this code must be audited          → audit required
```

LogicN does not guess intent. It asks the developer to declare intent, then checks whether the code matches.

---

## 2. Safety Levels

Declared on the flow or block header keyword.

| Level | Keyword | Meaning |
|---|---|---|
| `safe` | `safe flow` | Pure or low-risk; no side-effectful operations |
| `guarded` | `guarded flow` | Governed; declared effects, policies, and audit |
| `privileged` | `privileged flow` | High authority; requires declared capability |
| `unsafe` | `unsafe flow` / `unsafe block` | Bypasses safety; needs reason, approval, fallback |
| `experimental` | `experimental flow` | Non-production; blocked in production targets |

Unqualified `flow` defaults to governed behavior with no extra constraints — same as the existing `flow` keyword.

---

## 3. Effect Declarations

Effects name every security-sensitive operation a flow may perform.

```logicn
guarded flow createOrder(input: CreateOrderRequest)
  intent "create customer order"
  effects [database.write, network.call]
  requires capability OrderWriter
  audit required
{
  ...
}
```

### Canonical Effect Groups

| Prefix | Examples |
|---|---|
| `auth` | `auth.check`, `auth.issue` |
| `permission` | `permission.check`, `permission.grant` |
| `secret` | `secret.read`, `secret.write`, `secret.derive`, `secret.send` |
| `network` | `network.call`, `network.outbound` |
| `database` | `database.read`, `database.write`, `database.delete` |
| `payment` | `payment.charge`, `payment.refund` |
| `email` | `email.send` |
| `ai` | `ai.invoke` |
| `native` | `native.call` |
| `filesystem` | `filesystem.read`, `filesystem.write` |
| `shell` | `shell.execute` |
| `audit` | `audit.write` |

---

## 4. Intent Declarations

### Optionality Rule

```text
Intent optional  — pure/internal helper functions
Intent recommended — public package functions
Intent required  — all governed surfaces
```

### Governed Surfaces (Always Require Intent)

```text
API routes          webhooks        payment flows
secret access       network calls   AI invocations
native interop      deployment      unsafe blocks
privileged flows
```

### Syntax

```logicn
// Pure helper — no intent needed.
fn add(a: Int, b: Int) -> Int {
  return a + b
}

// Pure flow with intent.
pure flow calculateTotals(orders: List<Order>)
  intent "calculate order totals"
  effects []
  compute auto
{
  return orders.map(order => order.total)
}

// Guarded API flow — intent required.
guarded flow createOrder(input: CreateOrderRequest)
  intent "create customer order"
  effects [database.write, network.call]
  requires capability OrderWriter
  audit required
{
  let order = Order.from(input)
  database.orders.insert(order)
  return Created(order.id)
}

// Privileged flow.
privileged flow rotateSigningKey()
  intent "rotate JWT signing key"
  effects [secret.read, secret.write, audit.write]
  requires capability KeyRotationAdmin
  audit required
{
  ...
}

// Unsafe block.
unsafe block NativeImageResize
  intent "resize image using approved native library"
  reason "native library provides required image format support"
  requires approval "native-interop"
  fallback safeImageResize
{
  native.call("resize_image")
}

// Experimental flow.
experimental flow newFraudScoringModel(input: PaymentAttempt)
  intent "test new fraud scoring model"
  effects [ai.invoke]
  audit required
{
  ...
}
```

---

## 5. Diagnostic Codes — LLN-INTENT-*

Defined in `@logicn/core-compiler` as `LLN_INTENT_001` through `LLN_INTENT_005`.

| Code | Name | Condition |
|---|---|---|
| `LLN-INTENT-001` | `INTENT_BEHAVIOR_MISMATCH` | Declared intent conflicts with inferred behavior |
| `LLN-INTENT-002` | `MISSING_REQUIRED_INTENT` | Governed surface (API, webhook, payment, etc.) is missing an intent declaration |
| `LLN-INTENT-003` | `UNSAFE_MISSING_REASON_OR_FALLBACK` | Unsafe block/flow is missing reason, approval, or fallback |
| `LLN-INTENT-004` | `PRIVILEGED_MISSING_CAPABILITY` | Privileged flow does not declare required capability |
| `LLN-INTENT-005` | `EXPERIMENTAL_IN_PRODUCTION` | Experimental code included in production build target without explicit approval |

**Note:** The source design document uses `LN-INTENT-*`. The canonical format in this repo is `LLN-INTENT-*` (matching `LLN-CONFIG-*`, `LLN-LOGIC-*`, `LLN-STRING-*`, etc.).

### Example Diagnostic Output

```json
{
  "code": "LLN-INTENT-002",
  "name": "MISSING_REQUIRED_INTENT",
  "severity": "error",
  "message": "Governed surface requires an intent declaration.",
  "suggestedFix": "Add intent \"create customer order\" to the route."
}
```

---

## 6. Intent/Effect Consistency Check

If a flow declares intent and effects, the compiler checks for mismatches:

```logicn
// Bad: declared intent says "send receipt" but body performs delete.
safe flow sendReceipt(order: Order)
  intent "send customer receipt"
  effects [email.send]
{
  database.delete(order.id)
}
// ^ LLN-INTENT-001: Declared intent conflicts with inferred behavior.
//   Flow declared intent "send customer receipt" but performs destructive database.delete.
//   Declare database.delete explicitly or move it to a different flow.
```

---

## 7. Type Contracts

### In `@logicn/core`

```ts
export type SafetyLevel =
  | "safe" | "guarded" | "privileged" | "unsafe" | "experimental";

export interface IntentDeclaration {
  readonly text: string;
  readonly location?: SourceLocation;
}

export interface EffectReference {
  readonly name: string;            // e.g. "database.write"
  readonly location?: SourceLocation;
}

export interface FlowDeclarationMetadata {
  readonly name: string;
  readonly safetyLevel: SafetyLevel;
  readonly intent?: IntentDeclaration;
  readonly declaredEffects: readonly EffectReference[];
  readonly requiredCapabilities: readonly string[];
  readonly auditRequired: boolean;
  readonly traceEnabled: boolean;
  readonly unsafeReason?: string;   // unsafe blocks only
  readonly fallbackFlow?: string;   // unsafe blocks only
  readonly location?: SourceLocation;
}
```

### In `@logicn/core-compiler`

```ts
export interface IntentCheckResult {
  readonly flowName: string;
  readonly safetyLevel: CompilerSafetyLevel;
  readonly intent?: string;
  readonly declaredEffects: readonly string[];
  readonly inferredEffects: readonly string[];
  readonly mismatches: readonly IntentMismatch[];
  readonly diagnostics: readonly CompilerDiagnostic[];
}

export interface IntentMismatch {
  readonly kind: IntentMismatchKind;
  readonly message: string;
  readonly path?: string;
}
```

### In `@logicn/core-reports`

```ts
export interface IntentReport extends LoReportBase {
  readonly kind: "intent";
  readonly flows: readonly IntentFlowEntry[];
  readonly governedSurfaces: number;
  readonly missingIntent: number;
  readonly effectMismatches: number;
}

export interface SafetyReport extends LoReportBase {
  readonly kind: "safety";
  readonly flows: readonly SafetyFlowEntry[];
  readonly safeCount: number;
  readonly guardedCount: number;
  readonly privilegedCount: number;
  readonly unsafeCount: number;
  readonly experimentalCount: number;
  readonly experimentalInProduction: number;
}

export interface FlowTraceReport extends LoReportBase {
  readonly kind: "flow-trace";
  readonly events: readonly FlowTraceEventRecord[];
  readonly redactedFields: number;
}

export interface RuntimeFlowManifest {
  readonly id: string;
  readonly name: string;
  readonly safetyLevel: string;
  readonly intent?: string;
  readonly effects: readonly string[];
  readonly capabilities: readonly string[];
  readonly auditRequired: boolean;
  readonly traceEnabled: boolean;
}
```

---

## 8. AstNodeKind Additions

New node kinds added to `AstNodeKind` in `@logicn/core`:

| Kind | Syntax element |
|---|---|
| `guardedFlowDecl` | `guarded flow Name(...)` |
| `privilegedFlowDecl` | `privileged flow Name(...)` |
| `unsafeFlowDecl` | `unsafe flow Name(...)` |
| `experimentalFlowDecl` | `experimental flow Name(...)` |
| `unsafeBlock` | `unsafe block Name { ... }` |
| `intentDecl` | `intent "..."` in a flow header |
| `requiresCapabilityDecl` | `requires capability CapabilityName` |
| `fallbackDecl` | `fallback safeFlowName` in an unsafe block |

---

## 9. Flow Trace — Governed Evidence

Trace output is **governed evidence**, not a debug dump. All secrets and PII must be redacted before emission.

```jsonl
{"traceId":"trace_123","spanId":"s1","timestamp":"...","stage":"request.received","routeId":"POST /orders","status":"ok"}
{"traceId":"trace_123","spanId":"s2","timestamp":"...","stage":"request.decoded","status":"ok"}
{"traceId":"trace_123","spanId":"s3","timestamp":"...","stage":"validation.completed","status":"ok"}
{"traceId":"trace_123","spanId":"s4","timestamp":"...","stage":"capability.checked","capability":"OrderWriter","decision":"allow","status":"ok"}
{"traceId":"trace_123","spanId":"s5","timestamp":"...","stage":"effect.executed","effect":"database.write","status":"ok"}
{"traceId":"trace_123","spanId":"s6","timestamp":"...","stage":"response.encoded","status":"ok","metadata":{"statusCode":201}}
```

Rules:
- Secrets must never appear in trace metadata.
- PII must be redacted to `"[REDACTED]"`.
- `FlowTraceReport.redactedFields` must count all redacted values.

---

## 10. Runtime Auto-Parallelisation

When a flow is `pure` with `effects []`, the runtime may safely rewrite sequential operations to parallel:

```logicn
pure flow calculateTotals(orders: List<Order>)
  intent "calculate order totals"
  effects []
  compute auto
{
  return orders.map(order => order.total)
}
```

The runtime must emit a rewrite report:

```json
{
  "rewrite": "map_to_parallel_map",
  "source": "orders.map(order => order.total)",
  "workers": 8,
  "reason": "pure function, independent items, bounded memory",
  "fallback": "sequential_map"
}
```

Shared mutable state blocks parallelisation:

```logicn
// Bad: shared mutation — cannot be auto-threaded.
let count = 0
orders.forEach(order => { count = count + 1 })

// Good: functional fold — safe to optimise.
let count = orders.count()
```

---

## 11. Report Files Produced by `logicn build`

| File | Content |
|---|---|
| `intent-report.json` | Per-flow intent/effect consistency results |
| `safe-unsafe-report.json` | Safety level breakdown; `experimentalInProduction` count |
| `flow-trace-manifest.json` | Trace event schema for governed flows |
| `runtime-optimisation-report.json` | Parallelisation rewrites and fallbacks |

---

## 12. Design Rules

```text
1. Intent is optional for pure/internal functions.
2. Intent is required for all governed surfaces.
3. Effects are required when behavior crosses trust boundaries.
4. Unsafe blocks must declare reason, approval, and a safe fallback.
5. Privileged flows must declare required capability.
6. Experimental code must not enter production silently.
7. The runtime may auto-parallelise only when effects/purity prove it safe.
8. Trace output is governed evidence — never raw debug state.
9. Secret and PII redaction is mandatory in all traces and reports.
10. The compiler must reject intent/behavior mismatches.
```

---

## 13. Implementation Status

| Area | Status | Notes |
|---|---|---|
| `SafetyLevel` type | ✅ | `@logicn/core/src/index.ts` |
| `IntentDeclaration` type | ✅ | `@logicn/core/src/index.ts` |
| `EffectReference` type | ✅ | `@logicn/core/src/index.ts` |
| `FlowDeclarationMetadata` type | ✅ | `@logicn/core/src/index.ts` |
| `FlowTraceEvent` type | ✅ | `@logicn/core/src/index.ts` |
| AstNodeKind additions | ✅ | 8 new node kinds in `@logicn/core` |
| `IntentCheckResult`, `IntentMismatch` | ✅ | `@logicn/core-compiler` |
| `LLN-INTENT-001..005` constants | ✅ | `@logicn/core-compiler` |
| `CompilerSafetyLevel`, `GovernedSurfaceKind` | ✅ | `@logicn/core-compiler` |
| `FlowScope` extended to all safety levels | ✅ | `@logicn/core-compiler` (internal) |
| `parseFlowStart()` regex extended | ✅ | Recognises guarded/privileged/unsafe/experimental/unsafe block |
| `validateIntentEffects()` stub | ✅ | Returns empty result; TODOs in place for Stages 3–5 |
| `IntentReport`, `SafetyReport`, `FlowTraceReport` | ✅ | `@logicn/core-reports` |
| `RuntimeFlowManifest` type | ✅ | `@logicn/core-reports` |
| `createIntentReport()` | ✅ | `@logicn/core-reports` |
| `createSafetyReport()` | ✅ | `@logicn/core-reports` |
| `createFlowTraceReport()` | ✅ | `@logicn/core-reports` |
| Parser support (Stage 2) | ⏳ | Blocked on `compiler/logicn.js` extension |
| Intent/effect checker (Stage 3) | ⏳ | Stub in place; needs AST → checker wiring |
| Manifest generation (Stage 4) | ⏳ | Types ready; generator not yet wired |
| Runtime integration (Stage 5) | ⏳ | Deferred to runtime package |
| CLI integration (Stage 6) | ⏳ | Deferred to `@logicn/core-cli` |
