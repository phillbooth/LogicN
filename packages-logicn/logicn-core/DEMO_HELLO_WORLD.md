# LogicN hello World Demo

This document shows a simple **hello World** demo for **LogicN / LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and accelerator-aware programming language concept.

This demo is intentionally simple. It is designed to show the expected developer experience, file structure, source code style and build outputs.

---

## Demo Goal

The goal of this demo is to show:

```text
a basic .lln file
a simple secure flow
strict return type
Result-based success
safe project defaults
expected CLI commands
expected build output
source-map behaviour
AI-friendly explanation output
```

---

## Current Project Status

LogicN is currently a concept and design-stage project.

The commands in this file describe the intended future developer experience.

If no compiler exists yet, this file should be treated as a design demo rather than executable documentation.

---

## Minimal Script Version

The smallest possible LogicN demo should be a single file:

```text
hello.lln
```

Example:

```LogicN
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

Expected command:

```bash
LogicN run hello.lln
```

Expected output:

```text
hello from LogicN
```

---

## Why This Example Uses `secure flow`

The example uses:

```LogicN
secure flow
```

because LogicN should make safe behaviour the default pattern.

For very small examples, this may look slightly more formal than other scripting languages, but it makes the language rules clear from the beginning.

---

## Why This Example Returns `Result<Void, Error>`

The `main` flow returns:

```LogicN
Result<Void, Error>
```

This means:

```text
Ok()     = program completed successfully
Err(e)   = program failed with an explicit error
```

LogicN should avoid hidden exceptions and unhandled errors.

---

## Project Version

A slightly larger hello World project should use this structure:

```text
hello-LogicN/
├── boot.lln
├── src/
│   └── main.lln
├── .env.example
└── build/
```

---

## Example `boot.lln`

```LogicN
project "helloLO"

language {
  name "LogicN"
  version "0.1"
  compatibility "stable"
}

entry "./src/main.lln"

targets {
  binary {
    enabled true
    platform "linux-x64"
    output "./build/debug/app.bin"
  }

  wasm {
    enabled true
    output "./build/debug/app.wasm"
  }

  gpu {
    enabled true
    mode "plan"
    check true
    fallback "binary"
    output "./build/debug/app.gpu.plan"
  }

  photonic {
    enabled true
    mode "plan"
    check true
    fallback "gpu"
    output "./build/debug/app.photonic.plan"
  }

  ternary {
    enabled true
    mode "simulation"
    output "./build/debug/app.ternary.sim"
  }
}

security {
  memory_safe true
  strict_types true
  null "deny"
  undefined "deny"
  unsafe "deny"
  unhandled_errors "deny"
  implicit_casts "deny"
  truthy_falsy "deny"
  secret_logging "deny"
}

permissions {
  network "deny"
  file_read "deny"
  file_write "deny"
  environment "restricted"
  native_bindings "deny"
}

build {
  mode "debug"
  deterministic true
  source_maps true
  reports true
  ai_context true
}

imports {
  use system
  use environment
  use target.binary
  use target.gpu
  use target.photonic
  use target.threeway
}
```

---

## Example `src/main.lln`

```LogicN
secure flow main() -> Result<Void, Error> {
  print("hello from LogicN")
  return Ok()
}
```

---

## Intended Commands

Initialise a project:

```bash
LogicN init hello-LogicN
```

Run the project:

```bash
LogicN run
```

Run the single script version:

```bash
LogicN run hello.lln
```

Check the project:

```bash
LogicN check
```

Build all configured outputs:

```bash
LogicN build --target all
```

Generate AI context:

```bash
LogicN ai-context
```

Explain any failure for humans:

```bash
LogicN explain build/debug/app.failure-report.json
```

Explain any failure for AI tools:

```bash
LogicN explain --for-ai build/debug/app.failure-report.json
```

---

## Expected Run Output

```text
hello from LogicN
```

---

## Expected Build Output

After running:

```bash
LogicN build --target all
```

Expected output:

```text
build/debug/
├── app.bin
├── app.wasm
├── app.gpu.plan
├── app.photonic.plan
├── app.ternary.sim
├── app.target-report.json
├── app.security-report.json
├── app.failure-report.json
├── app.source-map.json
├── app.ai-context.json
└── app.build-manifest.json
```

---

## Output File Explanation

| File | Purpose |
|---|---|
| `app.bin` | CPU binary output |
| `app.wasm` | WebAssembly output |
| `app.gpu.plan` | GPU planning output |
| `app.photonic.plan` | Photonic planning output |
| `app.ternary.sim` | Ternary simulation output |
| `app.target-report.json` | Target compatibility report |
| `app.security-report.json` | Security settings and warnings |
| `app.failure-report.json` | Build or runtime failure report |
| `app.source-map.json` | Maps output back to original `.lln` files |
| `app.ai-context.json` | Compact AI-readable project context |
| `app.build-manifest.json` | Build metadata and hashes |

---

## Example Target Report

For this simple hello World program, the target report might look like this:

```json
{
  "project": "helloLO",
  "mode": "debug",
  "targets": [
    {
      "name": "binary",
      "status": "ok",
      "output": "build/debug/app.bin"
    },
    {
      "name": "wasm",
      "status": "ok",
      "output": "build/debug/app.wasm"
    },
    {
      "name": "gpu",
      "status": "not_required",
      "reason": "No compute blocks found.",
      "output": "build/debug/app.gpu.plan"
    },
    {
      "name": "photonic",
      "status": "not_required",
      "reason": "No compute blocks found.",
      "output": "build/debug/app.photonic.plan"
    },
    {
      "name": "ternary",
      "status": "not_required",
      "reason": "No Tri or Decision simulation required.",
      "output": "build/debug/app.ternary.sim"
    }
  ]
}
```

---

## Example Security Report

```json
{
  "project": "helloLO",
  "security": {
    "memorySafe": true,
    "strictTypes": true,
    "null": "deny",
    "undefined": "deny",
    "unsafe": "deny",
    "unhandledErrors": "deny",
    "implicitCasts": "deny",
    "truthyFalsy": "deny",
    "secretLogging": "deny"
  },
  "permissions": {
    "network": "deny",
    "fileRead": "deny",
    "fileWrite": "deny",
    "environment": "restricted",
    "nativeBindings": "deny"
  },
  "warnings": []
}
```

---

## Example AI Context

```json
{
  "project": "helloLO",
  "entry": "boot.lln",
  "sourceFiles": [
    "src/main.lln"
  ],
  "flows": [
    {
      "name": "main",
      "type": "secure flow",
      "returns": "Result<Void, Error>",
      "file": "src/main.lln",
      "line": 1
    }
  ],
  "routes": [],
  "webhooks": [],
  "computeBlocks": [],
  "rules": {
    "undefined": "deny",
    "null": "deny",
    "strictTypes": true,
    "unsafe": "deny"
  },
  "nextActions": [
    "No issues found."
  ]
}
```

---

## Example Source Map

```json
{
  "version": "0.1",
  "project": "helloLO",
  "outputs": [
    {
      "target": "binary",
      "output": "build/debug/app.bin",
      "mappings": [
        {
          "generated": {
            "offset": 128
          },
          "source": {
            "file": "src/main.lln",
            "line": 2,
            "column": 3
          },
          "symbol": "main.print"
        }
      ]
    }
  ]
}
```

---

## Example Failure

If the developer accidentally writes:

```LogicN
secure flow main() -> Result<Void, Error> {
  print(apiKey)
  return Ok()
}
```

where `apiKey` is a `SecureString`, the compiler should fail.

Example error:

```text
Security error:
SecureString cannot be printed.

Original source:
  src/main.lln:2:9

Suggestion:
  Do not log secrets. Use redact(apiKey) if you need a safe placeholder.
```

---

## Example `LogicN explain --for-ai`

```json
{
  "errorType": "SecurityError",
  "file": "src/main.lln",
  "line": 2,
  "column": 9,
  "problem": "SecureString cannot be printed.",
  "why": "Secrets must not be logged or written to standard output by default.",
  "suggestedFix": "Use redact(apiKey) or remove the print statement.",
  "safeExample": "log.info(\"API key loaded\", { key: redact(apiKey) })"
}
```

---

## Example Strict Type Failure

Invalid code:

```LogicN
secure flow main() -> Result<Void, Error> {
  let total = "10" + 5
  print(total)
  return Ok()
}
```

Expected error:

```text
Type error:
Cannot add String and Int.

Original source:
  src/main.lln:2:20

Suggestion:
  Convert the String explicitly using toInt("10").
```

Correct code:

```LogicN
secure flow main() -> Result<Void, Error> {
  let total: Int = toInt("10") + 5
  print(total)
  return Ok()
}
```

---

## Example Missing Value Failure

Invalid code:

```LogicN
secure flow main() -> Result<Void, Error> {
  let customer: Option<Customer> = findCustomer("123")

  print(customer.name)

  return Ok()
}
```

Expected error:

```text
Option error:
Cannot access field `name` on Option<Customer>.

Original source:
  src/main.lln:4:18

Suggestion:
  Use map to check the Option value first.
```

Correct code:

```LogicN
secure flow main() -> Result<Void, Error> {
  let customer: Option<Customer> = findCustomer("123")

  match customer {
    Some(c) => print(c.name)
    None    => print("Customer not found")
  }

  return Ok()
}
```

---

## hello World with JSON

A slightly more useful demo can show JSON decoding.

```LogicN
type helloRequest {
  name: String
}

type helloResponse {
  message: String
}

secure flow hello(input: helloRequest) -> Result<helloResponse, Error> {
  return Ok(helloResponse {
    message: "hello " + input.name
  })
}
```

JSON input:

```json
{
  "name": "LogicN"
}
```

JSON output:

```json
{
  "message": "hello LogicN"
}
```

---

## hello World API Demo

Example API route:

```LogicN
type helloResponse {
  message: String
}

api helloApi {
  GET "/hello" {
    response helloResponse
    timeout 5s
    handler helloHandler
  }
}

secure flow helloHandler(req: Request) -> Result<Response, Error> {
  return JsonResponse(helloResponse {
    message: "hello from LogicN"
  })
}
```

Expected response:

```json
{
  "message": "hello from LogicN"
}
```

---

## What This Demo Proves

This demo is small, but it introduces important LogicN concepts:

```text
.lln source files
secure flow
Result return type
strict type checking
no undefined
no silent null
security reports
source maps
AI context output
multi-target build structure
```

---

## What This Demo Does Not Prove

This demo does not prove:

```text
real photonic execution
real GPU execution
real ternary hardware execution
full API framework behaviour
full package management
full memory model
production compiler performance
```

Those are future goals.

---

## Next Demo Ideas

Future demo files should include:

```text
DEMO_JSON_API.md
DEMO_WEBHOOK.md
DEMO_DECISION.md
DEMO_ROLLBACK.md
DEMO_COMPUTE_BLOCK.md
DEMO_AI_CONTEXT.md
DEMO_SOURCE_MAP.md
```

---

## Final Note

hello World should remain simple.

It should show that LogicN starts from safe defaults:

```text
strict types
explicit success/failure
source-mapped errors
no undefined
no silent null
no unsafe memory
```

The first impression of LogicN should be:

> Safe, clear and ready for larger JSON/API systems.