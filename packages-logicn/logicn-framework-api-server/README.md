# LogicN API Server

`logicn-framework-api-server` is the first concrete HTTP API-serving package for LogicN.

In the current prototype/runtime phase, this package is expected to be
Node-hosted for practical web/API serving. Future implementations may use
native, WASM, serverless or other checked runtime adapters, but those are later
targets.

It belongs in:

```text
/packages-logicn/logicn-framework-api-server
```

It is designed to be used by:

```text
LogicN App Kernel
LogicN partial framework
bespoke frameworks
Node/Express/Fastify adapters
compiled native LogicN services
future serverless/cloud adapters
```

`logicn-framework-api-server` is **not** a full web framework.

It should not try to become Express, Laravel, Django, Rails, Symfony, Next.js,
NestJS or a CMS.

It should also not try to become Nginx, Apache or Caddy. Those are deployment
and reverse-proxy targets. LogicN deployment tooling may generate config for
them, while this package focuses on serving LogicN API route manifests.

Its job is smaller and stricter:

```text
receive HTTP requests
normalise requests
load LogicN API route manifests
pass requests into the LogicN App Kernel
apply server-level limits
return typed HTTP responses
write safe logs
generate runtime reports
```

---

## 1. Purpose

LogicN Core defines the language.

LogicN Runtime executes compiled LogicN safely.

LogicN App Kernel defines the secure application boundary.

LogicN Core Network defines network policy, profile and report contracts.

`logicn-framework-api-server` provides the HTTP server implementation that allows LogicN API routes
to run as real services.

The relationship is:

```text
HTTP Request
  ->
logicn-framework-api-server
  ->
logicn-framework-app-kernel
  ->
logicn-core-runtime
  ->
typed LogicN flow
  ->
logicn-core-runtime
  ->
logicn-framework-app-kernel
  ->
logicn-framework-api-server
  ->
HTTP Response
```

---

## 2. Package Position

Recommended package layout:

```text
/packages
  /logicn-core
  /logicn-core-compiler
  /logicn-core-runtime
  /logicn-core-network
  /logicn-framework-app-kernel
  /logicn-framework-api-server
  /logicn-api-adapters
```

Responsibilities:

| Package           | Responsibility                                      |
| ----------------- | --------------------------------------------------- |
| `logicn-core`         | Language rules, core types, syntax, diagnostics     |
| `logicn-core-compiler`     | Parse, check, compile, generate reports             |
| `logicn-core-runtime`      | Safe execution, memory limits, effects, permissions |
| `logicn-core-network`      | Network policy, profiles, backend capabilities and reports |
| `logicn-framework-app-kernel`   | API policy, auth, validation, route execution       |
| `logicn-framework-api-server`   | Built-in HTTP server for LogicN APIs                    |
| `logicn-api-adapters` | Express, Fastify, Lambda, Cloudflare, native adapters |

---

## 3. Main Design Rule

```text
LogicN Core should not serve APIs.
LogicN App Kernel should define API behaviour.
logicn-framework-api-server should serve HTTP.
Bespoke frameworks may use either logicn-framework-api-server or logicn-framework-app-kernel directly.
```

This keeps LogicN modular.

A simple LogicN API can run through `logicn-framework-api-server`.

A larger framework can reuse the same safe kernel without being forced to use
LogicN's built-in server.

## Current Node-Hosted Position

Current practical serving path:

```text
HTTP request
  -> Node.js server
  -> logicn-framework-api-server
  -> logicn-framework-app-kernel
  -> logicn-core-runtime
  -> typed LogicN flow
  -> HTTP response
```

This package should not claim to be a standalone native web server until a
non-Node runtime, async/event loop and HTTP stack exist as implemented, tested
and reportable components.

---

## 4. What logicn-framework-api-server Should Do

`logicn-framework-api-server` should provide:

```text
HTTP listening
request normalisation
route manifest loading
precompiled method/path dispatch where available
request size enforcement
server timeout enforcement
safe error responses
safe response writing
transport-level response header application
health endpoint support
runtime report output
structured logging
graceful shutdown
development reload support
production-safe defaults
```

It should work behind generated reverse-proxy config for Nginx, Apache or Caddy
and expose enough route metadata for body limits, timeouts, health checks,
security headers and raw-body webhook handling to be configured consistently.

When the compiler emits a route trie or equivalent method-indexed lookup table,
`logicn-framework-api-server` should use it instead of scanning route patterns
one by one. Unknown methods and paths should be rejected before body parsing,
auth work or handler execution.

It may also provide:

```text
TLS configuration
HTTP/2 support later
zero-copy send path where safe and supported
platform I/O backend integration where safe and supported
worker mode later
cluster mode later
serverless bridge later
metrics endpoint later
```

---

## 5. What logicn-framework-api-server Should Not Do

`logicn-framework-api-server` should not provide:

```text
CMS
admin dashboard
template engine
theme system
ORM
database migrations
page builder
frontend routing
React components
Angular components
Vue components
session-heavy web framework behaviour
plugin marketplace
large middleware ecosystem
business logic
payment logic
email provider logic
core network policy ownership
kernel packet-filter implementation
DPDK runtime bindings
```

Those belong in packages, frameworks or user applications.

---

## 6. LogicN App Kernel vs logicn-framework-api-server

### LogicN App Kernel

The App Kernel owns the safe application rules.

It should handle:

```text
typed route declarations
typed request decoding
typed response encoding
auth policy
scope checks
role checks
rate limit policy
idempotency policy
webhook replay protection
body validation
unknown field policy
duplicate key policy
memory budget policy
effect policy
error policy
audit report generation
```

### logicn-framework-api-server

The API server owns the HTTP transport.

It should handle:

```text
network socket
port binding
network policy loading
TLS policy application
HTTP request parsing
connection timeout
body stream handoff
server shutdown
response writing
server logs
server health checks
server config
```

The split should be strict.

`logicn-core-network` defines the network policy contracts consumed by the
server. The API server implements HTTP transport and emits transport facts for
network reports; it does not own the whole LogicN network model.

`logicn-framework-api-server` should not decide whether a user is authorised.

It should ask `logicn-framework-app-kernel`.

---

## 7. Example LogicN API Declaration

Example LogicN source:

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    handler createOrder

    auth {
      bearer required
      scopes ["orders.write"]
    }

    body {
      content_type "application/json"
      max_size 256kb
      unknown_fields "deny"
      duplicate_keys "deny"
    }

    limits {
      rate "30/minute"
      max_concurrent 5
      memory 32mb
      timeout 5s
    }

    idempotency {
      required true
      header "Idempotency-Key"
      ttl 24h
    }
  }
}
```

The compiler should turn this into a route manifest.

`logicn-framework-api-server` should load the manifest and serve it.

The route manifest should preserve security and resource policy, including
auth, CSRF, CORS, object/property authorization, declared effects, body limits,
timeouts, concurrency limits, response filtering and audit requirements.
It should also preserve response policy, including status/body contracts,
content type, cache policy, security headers, cookie attributes, redirect
safety, content negotiation and streaming requirements.

---

## 8. Example Runtime Flow

```text
1. Client sends POST /orders
2. logicn-framework-api-server receives the HTTP request
3. logicn-framework-api-server checks basic server limits
4. logicn-framework-api-server passes the request to logicn-framework-app-kernel
5. logicn-framework-app-kernel matches the route
6. logicn-framework-app-kernel validates content type
7. logicn-framework-app-kernel checks request body size
8. logicn-framework-app-kernel decodes the body into CreateOrderRequest
9. logicn-framework-app-kernel checks auth and scopes
10. logicn-framework-app-kernel checks rate limits and idempotency
11. logicn-framework-app-kernel calls the typed LogicN flow
12. LogicN Runtime executes the flow safely
13. logicn-framework-app-kernel encodes CreateOrderResponse
14. logicn-framework-api-server writes the HTTP response
15. reports and safe logs are generated
```

---

## 9. CLI Usage

The first version may expose the server through the main LogicN CLI:

```bash
LogicN serve
```

With environment:

```bash
LogicN serve --env development
LogicN serve --env production
```

With explicit manifest:

```bash
LogicN serve --manifest ./build/logicn-api-manifest.json
```

With explicit port:

```bash
LogicN serve --port 8080
```

Alternative direct binary/package command:

```bash
logicn-framework-api-server serve
```

Recommended long-term model:

```text
LogicN serve
```

is the normal developer command.

```text
logicn-framework-api-server
```

is the underlying package/tool.

---

## 10. Build Output

A compiled LogicN API project may output:

```text
/build
  /linux
    app
  /wasm
    app.wasm
  /reports
    target-report.json
    security-report.json
    memory-report.json
    api-report.json
    failure-report.json
  /manifest
    logicn-api-manifest.json
    logicn-permissions.json
    logicn-routes.json
    logicn-openapi.json
```

`logicn-framework-api-server` should primarily need:

```text
logicn-api-manifest.json
logicn-permissions.json
compiled runtime output
```

---

## 11. Manifest Example

Example route manifest:

```json
{
  "api": "OrdersApi",
  "version": "0.1.0",
  "routes": [
    {
      "method": "POST",
      "path": "/orders",
      "handler": "createOrder",
      "requestType": "CreateOrderRequest",
      "responseType": "CreateOrderResponse",
      "auth": {
        "type": "bearer",
        "required": true,
        "scopes": ["orders.write"]
      },
      "body": {
        "contentType": "application/json",
        "maxSize": "256kb",
        "unknownFields": "deny",
        "duplicateKeys": "deny"
      },
      "limits": {
        "rate": "30/minute",
        "maxConcurrent": 5,
        "memory": "32mb",
        "timeout": "5s"
      },
      "idempotency": {
        "required": true,
        "header": "Idempotency-Key",
        "ttl": "24h"
      }
    }
  ]
}
```

---

## 12. Server Configuration

Example config file:

```text
LogicN.server.config
```

Possible config:

```LogicN
server {
  host "0.0.0.0"
  port 8080
  env "production"

  request {
    max_body_size 1mb
    header_timeout 5s
    body_timeout 10s
    idle_timeout 30s
  }

  logging {
    level "info"
    redact_secure_values true
    include_request_id true
  }

  reports {
    output "./build/reports"
    security true
    memory true
    api true
  }

  health {
    enabled true
    path "/health"
  }
}
```

---

## 13. Recommended Folder Structure

Recommended first structure:

```text
/packages-logicn/logicn-framework-api-server
  README.md
  TODO.md
  package.json
  tsconfig.json

  /src
    index.ts

    /cli
      serve-command.ts
      config-loader.ts
      cli-options.ts

    /server
      create-server.ts
      start-server.ts
      stop-server.ts
      http-listener.ts
      graceful-shutdown.ts

    /request
      normalise-request.ts
      read-body-stream.ts
      request-context.ts
      request-id.ts
      parse-headers.ts

    /response
      write-response.ts
      response-context.ts
      error-response.ts
      safe-headers.ts

    /manifest
      load-api-manifest.ts
      validate-api-manifest.ts
      route-table.ts
      route-match.ts

    /kernel
      call-app-kernel.ts
      kernel-result.ts
      kernel-error.ts

    /limits
      body-size-limit.ts
      timeout-limit.ts
      concurrency-limit.ts
      memory-budget.ts

    /logging
      logger.ts
      redact-secure-values.ts
      request-log.ts

    /reports
      api-server-report.ts
      runtime-report-writer.ts
      failure-report-writer.ts

    /errors
      server-error.ts
      manifest-error.ts
      request-error.ts
      response-error.ts

    /types
      api-server-config.ts
      api-manifest.ts
      http-method.ts
      server-result.ts

  /examples
    /basic-api
      boot.lln
      routes.lln
      LogicN.server.config

    /webhook-api
      boot.lln
      webhook.lln
      LogicN.server.config

  /tests
    server-start.test.ts
    route-match.test.ts
    manifest-load.test.ts
    request-normalise.test.ts
    response-write.test.ts
    limits.test.ts
```

---

## 14. Minimal Early Structure

For the first prototype, keep it smaller:

```text
/packages-logicn/logicn-framework-api-server
  README.md
  TODO.md
  package.json
  tsconfig.json

  /src
    index.ts
    cli.ts
    create-server.ts
    load-manifest.ts
    route-match.ts
    call-kernel.ts
    write-response.ts
    errors.ts
    types.ts

  /examples
    /basic-api
      boot.lln
      routes.lln
      LogicN.server.config

  /tests
    basic-server.test.ts
```

This avoids overbuilding too early.

---

## 15. Public API Idea

The package should expose a small API.

Example TypeScript-style API for the prototype:

```ts
import { createLoApiServer } from "logicn-framework-api-server";

const server = await createLoApiServer({
  manifestPath: "./build/manifest/logicn-api-manifest.json",
  port: 8080,
  env: "production"
});

await server.start();
```

Adapter usage:

```ts
import { createLoApiHandler } from "logicn-framework-api-server";

const handler = await createLoApiHandler({
  manifestPath: "./build/manifest/logicn-api-manifest.json"
});

const response = await handler.handle(request);
```

The second model is important because bespoke frameworks can use the handler
without using LogicN's built-in HTTP listener.

---

## 16. Bespoke Framework Usage

A bespoke framework should have two options.

### Option 1: Use logicn-framework-api-server directly

```text
Bespoke Framework
  ->
logicn-framework-api-server
  ->
logicn-framework-app-kernel
  ->
LogicN Runtime
```

Good when the bespoke framework wants LogicN to own API serving.

### Option 2: Use logicn-framework-app-kernel directly

```text
Bespoke Framework HTTP Layer
  ->
logicn-framework-app-kernel
  ->
LogicN Runtime
```

Good when the bespoke framework already has its own HTTP server, routing, CMS,
admin area or frontend rendering.

### Option 3: Use adapter mode

```text
Express/Fastify/Lambda/Cloudflare
  ->
logicn-api-adapter
  ->
logicn-framework-app-kernel
  ->
LogicN Runtime
```

Good for existing ecosystems.

---

## 17. Adapter Strategy

Adapters should be separate from the server package where possible.

Recommended:

```text
/packages-logicn/logicn-api-adapters
  /express
  /fastify
  /aws-lambda
  /cloudflare-worker
  /node-http
```

`logicn-framework-api-server` may use a default Node/native HTTP adapter internally, but
external framework support should not bloat the core server package.

---

## 18. Security Defaults

`logicn-framework-api-server` should default to secure behaviour.

Default rules:

```text
deny unbounded request bodies
deny missing manifest
deny invalid manifest
deny unknown route unless fallback explicitly configured
deny insecure auth bypass
redact SecureString values
do not log bearer tokens
do not log cookies by default
do not expose stack traces in production
generate failure reports
require production config checks
```

Production warnings:

```text
missing rate limit
missing request size limit
missing timeout
missing auth on non-public route
idempotency missing on payment/order/webhook route
raw body access enabled
unsafe adapter enabled
debug logging enabled
```

---

## 19. Error Handling

`logicn-framework-api-server` should return safe error responses.

Example production error:

```json
{
  "error": {
    "code": "LogicN_API_REQUEST_INVALID",
    "message": "Request could not be processed",
    "requestId": "req_123"
  }
}
```

Example development error may include more detail:

```json
{
  "error": {
    "code": "LogicN_API_BODY_TOO_LARGE",
    "message": "Request body exceeded 256kb",
    "requestId": "req_123",
    "route": "POST /orders"
  }
}
```

Internal reports may contain more diagnostic information, but public responses
should remain safe.

---

## 20. Health Endpoint

`logicn-framework-api-server` may provide a simple health endpoint:

```text
GET /health
```

Example response:

```json
{
  "status": "ok",
  "service": "logicn-framework-api-server",
  "api": "OrdersApi",
  "version": "0.1.0"
}
```

Production rule:

```text
Health endpoints must not expose secrets, environment variables, tokens, stack traces or internal file paths.
```

---

## 21. Reports

`logicn-framework-api-server` should help generate runtime reports.

Possible reports:

```text
api-server-report.json
api-runtime-report.json
api-failure-report.json
api-security-report.json
api-memory-report.json
api-route-report.json
```

Example:

```json
{
  "server": "logicn-framework-api-server",
  "env": "production",
  "routesLoaded": 12,
  "routesPublic": 2,
  "routesProtected": 10,
  "warnings": [
    {
      "code": "LogicN_API_RATE_LIMIT_MISSING",
      "route": "GET /public-search",
      "message": "Route has no explicit rate limit"
    }
  ]
}
```

---

## 22. Development Mode

Development mode may allow:

```text
detailed route errors
manifest reload
local debug logging
source-mapped error output
local-only unsafe feature warnings
```

Development mode must still deny:

```text
token logging
SecureString logging
unbounded body size
silent auth bypass
unsafe native bindings without explicit permission
```

---

## 23. Production Mode

Production mode should enforce:

```text
safe error responses
no stack traces in HTTP responses
strict manifest validation
strict server config validation
redacted logs
timeouts
body limits
safe shutdown
security report generation
```

Production mode should fail startup if critical requirements are missing.

Examples:

```text
missing route manifest
invalid route manifest
invalid permissions file
production route with no body limit
production route with raw body access and no reason
production webhook with no replay protection
```

Production mode should also prefer verified boot-profile artefacts over runtime
discovery. The server should load the route manifest, security policy, schema
validators and runtime plan from checked build output, verify their hashes, and
defer optional packages until after readiness.

Fast response should be implemented through:

```text
precompiled method/path dispatch
early rejection of unknown method/path before body parsing
prebuilt request and response validators
warmed security policy tables
bounded worker pools
inbound transport policy
outbound connection pools
network performance reports
```

Keep-alive must be profile-controlled. HTTP/1.x keep-alive, HTTP/2
multiplexing and HTTP/3/QUIC should be selected by deployment profile and
reported, not assumed. Connection reuse must never bypass validation, auth,
TLS policy, rate limits, body limits, timeout policy, backpressure, secret-safe
logging or graceful shutdown.

---

## 24. Example Commands

Build a project:

```bash
LogicN build
```

Serve compiled API:

```bash
LogicN serve
```

Serve with explicit manifest:

```bash
LogicN serve --manifest ./build/manifest/logicn-api-manifest.json
```

Serve on a specific port:

```bash
LogicN serve --port 8080
```

Generate reports only:

```bash
LogicN serve --check
```

Run in development mode:

```bash
LogicN serve --env development
```

Run in production mode:

```bash
LogicN serve --env production
```

---

## 25. Naming Decision

Use these names:

```text
LogicN App Kernel
logicn-framework-app-kernel
logicn-framework-api-server
logicn-api-adapters
```

Avoid using:

```text
LogicN Kernel Framework
logicn-kernal-framework
```

Reason:

```text
kernel is the correct spelling
framework sounds too large
server is clearer for the HTTP package
```

Recommended wording:

```text
LogicN App Kernel is the secure application boundary.
logicn-framework-api-server is the built-in HTTP API server implementation.
```

---

## 26. First Version Scope

The first version of `logicn-framework-api-server` should support:

```text
load route manifest
start HTTP server
match method and path
normalise request
pass request to app kernel handler
write typed response
return safe errors
support health endpoint
support body size limit
support request timeout
write simple logs
write basic report
```

Do not start with:

```text
full middleware system
plugin system
ORM integration
template rendering
WebSocket support
GraphQL server
HTTP/2
TLS automation
cluster mode
serverless adapters
admin dashboard
```

Those can come later.

---

## 27. TODO

### Phase 1: Package Setup

```text
[ ] Create /packages-logicn/logicn-framework-api-server
[ ] Add README.md
[ ] Add TODO.md
[ ] Add package.json if using TypeScript prototype
[ ] Add tsconfig.json if using TypeScript prototype
[ ] Add src/index.ts
[ ] Export createLoApiServer()
[ ] Export createLoApiHandler()
```

### Phase 2: Manifest Loading

```text
[ ] Define ApiManifest type
[ ] Load logicn-api-manifest.json
[ ] Validate manifest structure
[ ] Validate route methods
[ ] Validate route paths
[ ] Validate handler references
[ ] Fail startup on invalid manifest
[ ] Add manifest-load tests
```

### Phase 3: HTTP Server

```text
[ ] Create basic HTTP server
[ ] Support host config
[ ] Support port config
[ ] Add graceful shutdown
[ ] Add health endpoint
[ ] Add request ID generation
[ ] Add basic request logging
[ ] Add safe error responses
```

### Phase 4: Route Matching

```text
[ ] Match static routes
[ ] Match route parameters
[ ] Reject unsupported HTTP methods
[ ] Return 404 for unknown routes
[ ] Return 405 for known path but wrong method
[ ] Add route matching tests
```

### Phase 5: Request Handling

```text
[ ] Normalise headers
[ ] Enforce max body size
[ ] Enforce request timeout
[ ] Support JSON request body
[ ] Preserve raw body only when allowed
[ ] Pass normalised request to logicn-framework-app-kernel
[ ] Add request handling tests
```

### Phase 6: Response Handling

```text
[ ] Accept KernelResult
[ ] Write status code
[ ] Write response headers
[ ] Write JSON response body
[ ] Add safe default headers
[ ] Prevent unsafe header injection
[ ] Add response tests
```

### Phase 7: Kernel Integration

```text
[ ] Define AppKernel interface
[ ] Add callAppKernel()
[ ] Pass route match into kernel
[ ] Pass request context into kernel
[ ] Receive typed response from kernel
[ ] Receive typed error from kernel
[ ] Add kernel integration tests
```

### Phase 8: Server Limits

```text
[ ] Add body size limit
[ ] Add header timeout
[ ] Add body timeout
[ ] Add idle timeout
[ ] Add concurrency limit
[ ] Add memory budget placeholder
[ ] Add limit report output
```

### Phase 9: Logging and Redaction

```text
[ ] Add structured logger
[ ] Redact Authorization header
[ ] Redact Cookie header by default
[ ] Redact SecureString values
[ ] Add request ID to logs
[ ] Add route ID to logs
[ ] Add safe production logging mode
```

### Phase 10: Reports

```text
[ ] Generate api-server-report.json
[ ] Generate api-route-report.json
[ ] Generate api-failure-report.json
[ ] Include loaded routes
[ ] Include server config
[ ] Include startup warnings
[ ] Include production safety warnings
```

### Phase 11: CLI

```text
[ ] Add logicn-framework-api-server serve command
[ ] Add --manifest option
[ ] Add --port option
[ ] Add --host option
[ ] Add --env option
[ ] Add --check option
[ ] Add --report option
```

### Phase 12: Examples

```text
[ ] Add basic API example
[ ] Add webhook example
[ ] Add protected route example
[ ] Add rate-limited route example
[ ] Add idempotent order route example
```

### Phase 13: Adapter Preparation

```text
[ ] Keep createLoApiHandler() independent from HTTP listener
[ ] Make handler usable by Express/Fastify later
[ ] Document adapter contract
[ ] Add placeholder /packages-logicn/logicn-api-adapters
```

---

## 28. Future Ideas

Later versions may support:

```text
HTTP/2
WebSocket
server-sent events
streaming responses
multipart upload
serverless adapters
Cloudflare Worker adapter
AWS Lambda adapter
Express adapter
Fastify adapter
native Linux service mode
Windows service mode
Docker health checks
Kubernetes probes
Prometheus metrics
OpenTelemetry export
```

These should be added only after the basic secure API server is stable.

---

## 29. Final Principle

`logicn-framework-api-server` should make LogicN practical without making LogicN heavy.

Final rule:

```text
LogicN Core defines the language.
LogicN Runtime executes safely.
LogicN App Kernel controls API security.
logicn-framework-api-server serves HTTP.
Bespoke frameworks can reuse logicn-framework-api-server or plug directly into logicn-framework-app-kernel.
```

`logicn-framework-api-server` should be:

```text
small
strict
secure
typed
reportable
replaceable
adapter-friendly
```

It should not be:

```text
a full web framework
a CMS
an ORM
a frontend framework
a plugin marketplace
a copy of Express
a copy of Laravel
```

Best positioning:

```text
Express is a flexible web framework.
LogicN App Kernel is a secure typed API runtime.
logicn-framework-api-server is the built-in HTTP server for that runtime.
```
