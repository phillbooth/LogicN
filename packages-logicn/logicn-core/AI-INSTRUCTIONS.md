# LogicN AI Instructions

This document provides guidance for AI coding assistants working on **LogicN / LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and accelerator-aware programming language concept.

AI assistants should use this file to understand the project goals, rules, naming conventions, design boundaries and expected behaviour when generating code, documentation, examples or architecture notes.

---

## Project Summary

LogicN / LogicN is a programming language concept designed to compile one `.lln` source project into multiple outputs.

Target outputs may include:

```text
CPU binary
WebAssembly
GPU plan
photonic plan
ternary simulation
OpenAPI contract
JSON schemas
security reports
target reports
source maps
AI context files
build manifests
```

The language should be practical on normal computers today while preparing for future accelerator hardware.

---

## Core Identity

LogicN should be:

```text
strictly typed
memory safe
security-first
JSON-native
API-native
AI-friendly
maths-oriented
accelerator-aware
source-map friendly
deployment-friendly
```

LogicN core is the language, compiler and safety contract. The optional LogicN Secure
App Kernel enforces request lifecycle, validation, auth, rate-limit,
idempotency, job and runtime-report boundaries. Full frameworks such as CMS,
admin UI, ORM, templates and frontend adapters must stay above the kernel.

LogicN should not become:

```text
a clone of another language
a loose scripting language
a photonic-only research language
a language that requires future hardware to be useful
a full web framework
a CMS or admin dashboard
a frontend framework clone
a mandatory ORM or template system
```

---

## Critical Rules

AI assistants must preserve these rules when helping with LogicN:

```text
Do not add undefined.
Do not add silent null.
Do not weaken strict typing.
Do not allow accidental truthy/falsy logic.
Do not hide errors.
Do not compile secrets into output files.
Do not remove source-map support.
Do not make photonic hardware mandatory.
Do not remove CPU fallback.
Do not make JSON fully dynamic by default.
Do not make unsafe memory normal.
Do not design or implement kernel, driver, privileged native binding or raw hardware access work without explicit maintainer or project permission.
Treat kernel and driver development as last-stage work.
Do not put full framework features into LogicN core.
Do not treat the Secure App Kernel as a CMS, ORM, UI framework or page builder.
```

---

## Backend Suggestion Rule

When updating LogicN core, preserve the backend runtime priorities from
`docs/backend-runtime-capability-roadmap.md`:

```text
language editions and compatibility rules
Bool, Tri, Decision and LogicN conversion rules
algebraic variants and exhaustive match
generic constraints, traits or protocols
structured concurrency, cancellation and streams
deterministic resource cleanup
safe compile-time metadata and attributes
native ABI and foreign-call boundaries
matrix/vector shape rules with scalar fallback
stable diagnostics and AI report schemas
```

Treat these as language/compiler concerns. Runtime enforcement belongs in the
Secure App Kernel. Full application opinions belong in frameworks.

---

## Kernel and Driver Boundary

AI assistants should not introduce kernel modules, operating-system drivers,
privileged runtimes, vendor SDK driver bindings or raw hardware access into LogicN
docs, examples, compiler code or runtime code unless the user or maintainer has
explicitly approved that work.

Default guidance:

```text
applications first
safe compiler and reports first
normal targets first
kernel and driver development last
permission required before planning or implementation
```

---

## File Extension Rule

LogicN source files use:

```text
.lln
```

Use:

```text
boot.lln
main.lln
order-service.lln
payment-webhook.lln
fraud-check.lln
```

## Entry File Rule

For full projects, prefer:

```text
boot.lln
```

For small examples or scripts, `main.lln` is acceptable.

Recommended:

```text
boot.lln = project entry and configuration
src/main.lln = application entry flow
```

---

## Naming Guidance

Use clear names.

Preferred:

```text
LogicN
LogicN
boot.lln
LogicN.config
LogicN.lock
packages/
vendor/
build/
```

Avoid vague names such as:

```text
future-safe-language
my-new-lang
```

Unless discussing historical notes or alternatives.

---

## Recommended Project Structure

Use this structure for examples unless a smaller script is more appropriate:

```text
my-logicn-app/
├── boot.lln
├── LogicN.config
├── LogicN.lock
├── .env.example
├── src/
│   ├── main.lln
│   ├── routes.lln
│   └── services/
├── app/
│   ├── controllers/
│   ├── models/
│   ├── views/
│   ├── middleware/
│   └── services/
├── components/
├── packages/
├── vendor/
├── config/
├── public/
├── storage/
├── tests/
└── build/
```

For short scripts:

```text
hello.lln
```

---

## Language Style

Prefer clear, compact and predictable syntax.

Good LogicN examples should be:

```text
easy to read
strictly typed
explicit about errors
explicit about missing values
clear about permissions
clear about target fallback
clear about JSON types
clear about API contracts
```

Avoid clever syntax that is hard to explain.

---

## Function / Flow Style

Use:

```LogicN
flow
```

for normal functions.

Use:

```LogicN
secure flow
```

for security-sensitive workflows.

Use:

```LogicN
pure flow
```

for deterministic logic without side effects.

Example:

```LogicN
secure flow processOrder(order: Order) -> Result<Decision, OrderError> {
  return Ok(Review)
}
```

---

## Strict Type Rule

Always prefer strict types.

Bad:

```LogicN
let total = "10" + 5
```

Good:

```LogicN
let total: Int = toInt("10") + 5
```

Bad:

```LogicN
if customer {
  process(customer)
}
```

Good:

```LogicN
match customer {
  Some(c) => process(c)
  None    => return Review("Customer missing")
}
```

---

## Missing Value Rule

Do not use `undefined`.

Do not use silent `null`.

Use:

```LogicN
Option<T>
```

Example:

```LogicN
let customer: Option<Customer> = findCustomer(customerId)

match customer {
  Some(c) => processCustomer(c)
  None    => return Review("Customer not found")
}
```

---

## Error Handling Rule

Use:

```LogicN
Result<T, Error>
```

for fallible operations.

Example:

```LogicN
flow loadOrder(id: OrderId) -> Result<Order, OrderError> {
  let order = database.findOrder(id)

  match order {
    Some(o) => return Ok(o)
    None    => return Err(OrderError.NotFound)
  }
}
```

Unhandled errors should be treated as invalid LogicN design.

---

## Decision Rule

For business and security decisions, prefer:

```LogicN
Decision
```

Example:

```LogicN
enum Decision {
  Allow
  Deny
  Review
}
```

Use `Decision` instead of `Bool` when a third state is needed.

Bad:

```LogicN
let allowed: Bool = checkRisk(order)
```

Good:

```LogicN
let decision: Decision = checkRisk(order)
```

---

## Boolean Rule

Use `Bool` only for genuine true/false values.

Do not use booleans for uncertain states.

Good:

```LogicN
let isEnabled: Bool = true
```

Better for risk/security:

```LogicN
enum Decision {
  Allow
  Deny
  Review
}
```

---

## Tri Rule

Use `Tri` for mathematical, signal or model-state 3-way logic.

Example states:

```text
Positive
Neutral
Negative
```

Use `Decision` for business workflows.

Use `Tri` for lower-level ternary or model concepts.

---

## JSON Rule

LogicN is JSON-native but strict.

Preferred:

```LogicN
let order: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

Allowed when needed:

```LogicN
let raw: Json = req.json()
let eventType: String = raw.path("$.type").asString()
```

Do not make JSON handling loosely typed by default.

---

## JSON Safety Rule

When generating JSON/API examples, include safe defaults where relevant.

Example:

```LogicN
json_policy {
  max_body_size 1mb
  max_depth 32
  duplicate_keys "deny"
  unknown_fields "warn"
  null_fields "deny"
  date_format "iso8601"
}
```

LogicN should protect against:

```text
oversized payloads
deep nesting attacks
duplicate keys
unexpected null
wrong types
missing fields
unsafe number conversion
schema drift
secret leakage
```

---

## API Rule

LogicN should be API-native.

Prefer explicit API contracts.

Example:

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    errors [ValidationError, PaymentError]
    timeout 5s
    max_body_size 1mb
    handler createOrder
  }
}
```

When generating API examples, include:

```text
typed request
typed response
errors where useful
timeout where useful
max body size where useful
handler name
```

---

## Webhook Rule

Webhooks should be secure by default.

A webhook example should usually include:

```text
HMAC verification
secret from environment
max age
max body size
replay protection
idempotency key
handler
```

Example:

```LogicN
webhook PaymentWebhook {
  path "/webhooks/payment"
  method POST

  security {
    hmac_header "Payment-Signature"
    secret env.secret("PAYMENT_WEBHOOK_SECRET")
    max_age 5m
    max_body_size 512kb
    replay_protection true
  }

  idempotency_key json.path("$.id")
  handler handlePaymentWebhook
}
```

---

## Secrets Rule

Never compile secrets into output files.

Use:

```LogicN
let apiKey: SecureString = env.secret("API_KEY")
```

Do not use:

```LogicN
let apiKey: String = "real-secret-value"
```

`SecureString` values must not be printed or logged by default.

Bad:

```LogicN
print(apiKey)
```

Good:

```LogicN
log.info("API key loaded", { key: redact(apiKey) })
```

---

## Environment Rule

Runtime configuration should stay outside compiled files.

Use:

```text
.env for local development
.env.example for repository examples
server environment variables for production
container secrets
cloud secrets managers
```

Do not suggest committing real `.env` files.

---

## Compute Block Rule

Use compute blocks for accelerator-suitable work.

Example:

```LogicN
compute target best {
  prefer photonic
  fallback gpu
  fallback cpu

  score = fraudModel(features)
}
```

Compute blocks should normally contain:

```text
pure maths
matrix operations
vector operations
tensor operations
model inference
signal processing
```

Do not place I/O inside compute blocks.

Bad:

```LogicN
compute target photonic {
  data = readFile("./data.json")
}
```

Good:

```LogicN
data = readFile("./data.json")

compute target photonic fallback gpu fallback cpu {
  result = model(data)
}
```

---

## Target Rule

LogicN should always preserve CPU compatibility.

Target priority:

```text
CPU binary first
WASM for portability
GPU planning because GPUs exist today
photonic planning for future hardware
ternary simulation for 3-way logic testing
```

Never make photonic hardware required for normal LogicN applications.

---

## Build Output Rule

Use this build output structure unless a smaller example is needed:

```text
build/
├── app.bin
├── app.wasm
├── app.gpu.plan
├── app.photonic.plan
├── app.ternary.sim
├── app.openapi.json
├── app.api-report.json
├── app.target-report.json
├── app.security-report.json
├── app.failure-report.json
├── app.source-map.json
├── app.ai-context.json
└── app.build-manifest.json
```

---

## Source Map Rule

Source maps are essential.

Never remove them from the LogicN concept.

Errors should map back to original `.lln` files.

Example:

```text
Runtime error: PaymentStatus.Unknown was not handled.

Original source:
  app/services/order-service.lln:42:7

Suggestion:
  Add a match branch for Unknown.
```

---

## AI Context Rule

LogicN should generate AI-readable context.

Suggested command:

```bash
LogicN ai-context
```

Suggested outputs:

```text
build/app.ai-context.json
build/app.ai-context.md
```

The AI context should summarise:

```text
project
entry file
source files
routes
webhooks
types
imports
permissions
targets
errors
suggested next actions
```

Purpose:

```text
Reduce AI token usage.
Reduce the need to paste large files.
Make AI debugging easier.
```

---

## AI Explain Rule

LogicN should support:

```bash
LogicN explain --for-ai
```

This should produce compact machine-readable explanations.

Example:

```json
{
  "errorType": "TargetCompatibilityError",
  "target": "photonic",
  "file": "src/fraud-check.lln",
  "line": 18,
  "column": 12,
  "problem": "readFile cannot run inside a photonic compute block.",
  "why": "Photonic targets only support approved maths, tensor, matrix and model operations.",
  "suggestedFix": "Move readFile outside the compute block and pass the parsed data into the model."
}
```

Do not include secrets in AI output.

---

## Security Report Rule

LogicN should generate:

```text
build/app.security-report.json
```

The security report should include:

```text
security settings
permissions
unsafe usage
secret access
package permissions
webhook security checks
JSON policy checks
API timeout checks
source-map status
target fallback security notes
```

---

## Target Report Rule

LogicN should generate:

```text
build/app.target-report.json
```

The target report should explain:

```text
which targets passed
which targets failed
which targets used fallback
which compute blocks were compatible
which operations could not be accelerated
```

---

## Failure Report Rule

LogicN should generate:

```text
build/app.failure-report.json
```

Failure reports should include:

```text
error type
source file
source line
source column
build stage
target
problem
suggested fix
safe example where possible
```

---

## Build Manifest Rule

LogicN should generate:

```text
build/app.build-manifest.json
```

The manifest should include:

```text
project name
project version
compiler version
build mode
target outputs
source hash
output hash
dependency hashes
created timestamp
```

---

## Deployment Rule

LogicN should support build-once, deploy-many.

Recommended flow:

```text
1. Build once
2. Generate manifest
3. Generate hashes
4. Verify artefact
5. Deploy same artefact to many servers
6. Each server loads its own environment variables
7. Health check each server
8. Roll back if checks fail
```

Do not recommend compiling secrets into the build.

---

## Decompilation Rule

Assume compiled output can be reverse engineered.

Do not treat compiled files as secret.

Use:

```text
external secrets
symbol stripping
separate source maps
build signing
checksums
optional obfuscation
```

But never rely on obfuscation for secret protection.

---

## Licence Rule

LogicN uses the Apache License 2.0.

The repository should include:

```text
LICENSE
LICENCE.md
NOTICE.md
```

When writing licence text:

```text
Use Apache-2.0.
Preserve attribution.
Do not imply forks are official.
Do not claim the licence prevents all similar ideas.
```

---

## Git Documentation Rule

The documentation bundle should include two Git documents:

```text
GIT.md
COMPILED_APP_GIT.md
```

`GIT.md` should cover the Git workflow for the LogicN language repository.

`COMPILED_APP_GIT.md` should cover Git and deployment practices for applications built with LogicN.

---

## Example Quality Rules

Examples should be:

```text
short enough to understand
strictly typed
safe by default
source-map friendly
JSON/API aware where relevant
explicit about errors
explicit about missing values
explicit about target fallback
```

Avoid examples that:

```text
use undefined
use silent null
hide errors
log secrets
place I/O in compute blocks
use loose typing
use booleans for uncertain decisions
ignore webhook security
```

---

## Preferred Example Pattern

For order/payment examples, prefer:

```LogicN
enum PaymentStatus {
  Paid
  Unpaid
  Pending
  Failed
  Refunded
  Unknown
}

enum Decision {
  Allow
  Deny
  Review
}

secure flow processOrder(order: Order) -> Result<Decision, OrderError> {
  match order.payment.status {
    Paid => {
      shipOrder(order)
      return Ok(Allow)
    }

    Pending => {
      holdForReview(order, reason: "Payment pending")
      return Ok(Review)
    }

    Failed => {
      cancelOrder(order)
      return Ok(Deny)
    }

    Unknown => {
      holdForReview(order, reason: "Payment status unknown")
      return Ok(Review)
    }
  }
}
```

---

## Preferred API Example Pattern

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    errors [ValidationError, PaymentError]
    timeout 5s
    max_body_size 1mb
    handler createOrder
  }
}

secure flow createOrder(req: Request) -> Result<Response, ApiError> {
  let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)

  match validateOrder(input) {
    Ok(order) => return JsonResponse(order)
    Err(error) => return Err(error)
  }
}
```

---

## Preferred Webhook Example Pattern

```LogicN
webhook PaymentWebhook {
  path "/webhooks/payment"
  method POST

  security {
    hmac_header "Payment-Signature"
    secret env.secret("PAYMENT_WEBHOOK_SECRET")
    max_age 5m
    max_body_size 512kb
    replay_protection true
  }

  idempotency_key json.path("$.id")
  handler handlePaymentWebhook
}

secure flow handlePaymentWebhook(req: Request) -> Result<Response, WebhookError>
effects [network.inbound] {
  let event: PaymentEvent = json.decode<PaymentEvent>(req.body)

  match event.type {
    "payment.succeeded" => handlePaymentSucceeded(event)
    "payment.failed"    => handlePaymentFailed(event)
    _ => return JsonResponse({ "ignored": true })
  }

  return JsonResponse({ "received": true })
}
```

---

## Tone for Documentation

Use clear technical writing.

Prefer:

```text
short sections
plain explanations
concrete examples
tables where useful
consistent terminology
explicit rules
```

Avoid:

```text
marketing hype
unsupported claims
over-promising hardware support
vague futuristic language without practical use
```

LogicN should be presented as practical first, future-facing second.

---

## Claims to Avoid

Do not claim:

```text
LogicN can do impossible maths before a real backend exists.
LogicN makes all software secure automatically.
LogicN requires photonic hardware.
LogicN already has a real photonic backend.
LogicN prevents all reverse engineering.
LogicN eliminates all AI token usage.
```

Better wording:

```text
LogicN is designed to reduce boilerplate and generate AI-readable context.
LogicN can target normal CPU systems today and plan future accelerator support.
LogicN aims to make safe code easier and unsafe code harder.
```

---

## Current Project Stage

The project is currently:

```text
concept and documentation stage
```

Do not write as if a full compiler already exists unless clearly marked as future design.

Use phrases such as:

```text
should
could
planned
proposed
future version
initial prototype
```

When writing future-facing sections.

---

## AI Assistant TODO

AI assistants can help with:

```text
documentation
syntax examples
grammar drafts
AST design
source-map schema
compiler report schema
AI context schema
security rules
JSON/API examples
webhook examples
target planning examples
Git workflow docs
compiled app deployment docs
```

AI assistants should not:

```text
weaken the core rules
invent unsupported runtime claims
remove practical CPU support
ignore JSON/API use cases
skip security defaults
```

---

## Final AI Instruction

When helping with LogicN, prioritise:

```text
safety
clarity
strict typing
JSON/API usefulness
debuggability
AI-readable reports
CPU compatibility
future accelerator planning
```

The best LogicN answer should make the language more practical today while keeping it ready for future compute targets.
