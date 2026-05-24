# Generated Output And Runtime Ergonomics

LogicN should make a successful build useful to humans, deployment tools and AI
assistants. The goal is not just to run code. The goal is to produce checked,
documented and explainable software.

## Runtime-First Output

The first practical outputs should support a checked web runtime:

```text
typed IR cache
route manifest
type manifest
effect manifest
permission report
security report
memory report
source maps
AI-safe project summary
generated API documentation
build manifest
```

Native binary output can remain a later target. A normal web app should be able
to run through `logicn serve` once the runtime slice is ready.

## Developer Workflow

Recommended commands:

```text
logicn check
logicn run
logicn serve
logicn test
logicn reports
logicn security
logicn routes
```

Each command should produce stable machine-readable output where useful.

## Ergonomics Goals

LogicN should keep common work direct:

```text
define a request type
define a response type
define a secure flow
declare effects
map Result and Option
decode JSON into a typed contract
return a typed response
read generated reports
share redacted AI context
```

The standard library baseline should cover common safe work:

```text
Array
Map
Set
Option
Result
Json
Http
File
Path
Stream
DateTime
Random
SecureRandom
Secret
Pattern
Test
```

## Build Outputs

Successful builds should be able to emit:

```text
build/logicn.ir.json
build/logicn.routes.json
build/logicn.types.json
build/logicn.effects.json
build/logicn.permissions.json
build/logicn.security-report.json
build/logicn.memory-report.json
build/logicn.api-report.json
build/logicn.source-map.json
build/logicn.ai-context.json
build/logicn.build-manifest.json
```

These outputs should make the application easier to:

```text
serve
audit
debug
review
document
profile
deploy
explain to AI tools
```

## Runtime Speed Without Binary Output

A secure runtime can still be fast when it avoids repeating work.

Recommended fast paths:

```text
parse once
type-check once
cache typed IR
compile route tables once
generate JSON codecs once
precompute policy decisions
load production package profiles once
reuse source maps
stream large data
borrow read-only payload views
```

Runtime reports should point developers toward clear improvements:

```text
large copy detected
unbounded request body
slow JSON decode path
route has repeated policy work
handler blocks worker pool
secret-safe logging disabled
fallback used
```

## AI-Safe Output

AI output must be safe by default.

Rules:

```text
never include secret values
redact private config
include source maps
include route and type summaries
include package authority summaries
include security decisions
include memory warnings
exclude raw logs unless explicitly sanitized
```

## Best Build Promise

```text
A LogicN build should tell you what the app is, what it can access, how it
handles data, where it may be risky, and how the runtime will serve it.
```
