# About LogicN / LogicN

**LogicN**, short for **LogicN**, is a language-design concept for a strict, memory-safe, security-first programming language that can compile one source project into multiple target outputs.

LogicN is designed to run on normal binary CPU systems today while preparing for future accelerator targets such as GPU, WebAssembly, photonic compute and ternary / 3-way logic systems.

---

## What Is LogicN?

LogicN is a proposed programming language for modern software systems that need to be:

- Safe
- Strict
- Fast
- Clear
- API-native
- JSON-native
- AI-friendly
- Maths-oriented
- Deployment-friendly
- Accelerator-aware

The language is intended to support short scripts, backend services, API applications, webhook systems, data pipelines, AI workflows and larger MVC-style applications.

---

## Why LogicN Exists

Modern software is no longer only about writing code for one type of computer.

Applications increasingly involve:

```text
REST APIs
webhooks
JSON payloads
AI model calls
GPU workloads
multi-server deployment
security policies
external services
event queues
worker pools
data pipelines
risk decisions
```

LogicN exists as a concept because these areas are often handled through a mix of frameworks, external packages, runtime conventions and manual developer discipline.

LogicN aims to make these concerns part of the language and compiler design from the start.

---

## Main Idea

The main idea behind LogicN is:

> Write one safe, strict `.lln` source project and compile it into several useful outputs.

Example target outputs:

```text
CPU binary
WebAssembly
GPU execution plan
photonic execution plan
ternary simulation
OpenAPI contract
JSON schemas
security reports
target reports
source maps
AI context files
build manifests
```

LogicN should not require future hardware to be useful.

It should work on normal computers first, while keeping the language ready for accelerator hardware later.

---

## What LogicN Is Not

LogicN is not intended to be:

```text
a replacement for every programming language
a photonic-only research language
a clone of another language
a magic AI language
an operating system
a hardware vendor-specific language
```

LogicN should be practical before it is futuristic.

The future-facing hardware ideas should enhance the language, not make it unusable today.

---

## Core Identity

LogicN should combine practical language-design goals:

| Area | LogicN Direction |
|---|---|
| Memory safety | Explicit errors, safe ownership ideas and checked boundaries |
| Typed clarity | Familiar, readable typed structures |
| Runtime deployment | Secure APIs, workers and concurrency without a binary-first requirement |
| Maths usefulness | Matrix, tensor and AI-friendly operations |
| Readability | Clear and approachable syntax |
| Security engineering | Permissions, effects, secrets and safe defaults |
| Future hardware | GPU, photonic and ternary target planning |

LogicN should learn from proven ideas without presenting itself as a clone or
replacement of another community's work.

It should learn from them and focus on its own purpose.

---

## Core Principles

LogicN should be based on these principles:

```text
No undefined.
No silent null.
No hidden errors.
No unsafe memory by default.
No accidental truthy/falsy logic.
No implicit type coercion.
No compiled secrets.
No unreported target fallback.
No runtime error without original source mapping.
```

These principles should guide all syntax, compiler and runtime decisions.

---

## Practical Purpose

LogicN should be useful for developers building:

```text
API services
webhook processors
JSON-heavy applications
AI model pipelines
fraud/risk systems
secure backend services
worker-based systems
event-driven systems
scientific or maths-heavy tools
future accelerator-aware applications
```

The first useful version of LogicN should focus on safe backend and JSON/API development.

Photonic support can begin as a target plan and simulation layer before becoming a real backend.

---

## Example Use Case

A LogicN application could receive a payment webhook, validate the payload, check fraud risk, make a safe business decision and deploy as a single binary.

Example flow:

```text
Receive webhook
Verify signature
Decode JSON into strict type
Check idempotency key
Run fraud model
Use GPU/photonic plan if available
Return Allow / Deny / Review
Write audit log
Generate source-mapped error reports if anything fails
```

This shows why LogicN should be both practical and future-facing.

---

## Why Strict Types Matter

LogicN should use strict types to prevent common mistakes.

For example, this should not be aLOwed:

```LogicN
let total = "10" + 5
```

The developer should write:

```LogicN
let total: Int = toInt("10") + 5
```

LogicN should avoid loose behaviour that can lead to security bugs, payment errors or unexpected API behaviour.

---

## Why JSON Matters

JSON is one of the most common formats used in modern APIs, webhooks, event systems and AI tooling.

LogicN should treat JSON as a first-class concern.

That means supporting:

```text
typed JSON decoding
raw JSON access
JSON schema generation
OpenAPI generation
streaming JSON parsing
JSON Lines
partial JSON decoding
safe logging and redaction
strict validation
```

Production systems should prefer typed JSON:

```LogicN
let order: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

Raw JSON should still be available when needed:

```LogicN
let payload: Json = req.json()
```

---

## Why API-Native Design Matters

Many developers build software that talks to many systems at once.

LogicN should support:

```text
REST routes
webhooks
typed requests
typed responses
HMAC verification
replay protection
idempotency keys
timeouts
retries
circuit breakers
rate limits
worker pools
channels
backpressure
```

This would make LogicN useful for real backend development, not only theoretical compute experiments.

---

## Why Source Maps Matter

Compiled languages can make debugging harder if the runtime error only points to generated output.

LogicN should always be able to map errors back to the original `.lln` file.

Example error:

```text
Runtime error: PaymentStatus.Unknown was not handled.

Original source:
  app/services/order-service.lln:42:7

Suggestion:
  Add a match branch for Unknown.
```

This is essential for developer experience.

---

## Why `.env` Stays Outside the Build

LogicN should never compile real secrets into output files.

Secrets should live in:

```text
.env files for local development
server environment variables
container secrets
cloud secrets managers
deployment platform secrets
```

This aLOws the same compiled build to be deployed across multiple servers with different runtime configuration.

Recommended rule:

```text
Compiled files are not secret.
Secrets live outside compiled files.
```

---

## Why AI-Friendliness Matters

LogicN should be designed so AI coding assistants can understand projects efficiently.

This means:

```text
clear syntax
stable grammar
predictable folders
machine-readable compiler reports
source maps
AI context files
strict project rules
clear examples
compact generated summaries
```

A future command such as:

```bash
LogicN ai-context
```

could generate:

```text
build/app.ai-context.json
build/app.ai-context.md
```

These files would help developers share compact project context with AI tools without pasting large amounts of code.

---

## Why Future Hardware Matters

LogicN is not claiming that photonic computers can calculate things ordinary languages cannot describe.

The opportunity is about efficiency and target selection.

Some workloads may be better suited to:

```text
CPU
GPU
photonic accelerator
AI accelerator
ternary simulation
```

LogicN should let the compiler analyse code and explain where each part can run.

Example:

```text
payment validation        → CPU
fraud model maths         → GPU / photonic plan
risk decision             → ternary / 3-way logic
API handling              → CPU runtime
dashboard component       → WASM
```

---

## Name Meaning

**LogicN** stands for:

```text
LogicN
```

Possible meaning of the `3`:

```text
3-way / ternary logic
three target classes: CPU, accelerator, simulation
three decision states: ALOw, Deny, Review
```

The name is short, technical and suitable for a command-line tool:

```bash
LogicN build
LogicN run
LogicN check
```

---

## Licence

LogicN is intended to use the **Apache License 2.0**.

Apache-2.0 aLOws free use, modification, distribution and commercial adoption while preserving licence and notice requirements.

The project should include:

```text
LICENSE
LICENCE.md
NOTICE.md
```

The `LICENSE` file should contain the official Apache-2.0 licence text.

The `NOTICE.md` file should preserve attribution notices for the original LogicN project.

The `LICENCE.md` file should explain the licence in plain English.

---

## Project Status

LogicN is currently a concept and planning-stage language-design project.

The early focus is:

```text
documentation
syntax examples
language rules
compiler architecture
security model
JSON/API model
source-map design
AI-context design
build output design
```

The first practical implementation target is a Node.js-hosted checked interpreter/prototype that proves syntax, safety checks, diagnostics, reports and developer workflow before native, WASM or accelerator backends become hard dependencies.

---

## Planned Documentation Bundle

The LogicN repository should include:

```text
README.md
ABOUT.md
CONCEPT.md
LICENSE
LICENCE.md
NOTICE.md
REQUIREMENTS.md
DESIGN.md
TASKS.md
TODO.md
ROADMAP.md
ARCHITECTURE.md
SECURITY.md
CONTRIBUTING.md
CODE_OF_CONDUCT.md
AI-INSTRUCTIONS.md
CHANGELOG.md
GETTING_STARTED.md
DEMO_hello_WORLD.md
GIT.md
COMPILED_APP_GIT.md
.env.example
.gitignore
docs/
```

Additional requested Git documentation:

```text
GIT.md
```

Purpose:

```text
Git workflow for the LogicN language/project repository itself.
```

And:

```text
COMPILED_APP_GIT.md
```

Purpose:

```text
Git and deployment guidance for applications built with LogicN, including what should and should not be committed after compilation.
```

---

## Final Vision

LogicN / LogicN aims to become a developer-friendly language concept for secure, modern and future-ready software.

The long-term vision is:

> A strict, memory-safe, JSON-native, API-native, AI-friendly and accelerator-aware language that can compile one source project into normal CPU binaries, WebAssembly, GPU plans, photonic plans, ternary simulations and machine-readable safety reports.
