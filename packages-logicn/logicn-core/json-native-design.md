# LogicN JSON-Native Design

This document describes the proposed JSON-native design for **LogicN / LogicN**.

LogicN is a strict, memory-safe, security-first, JSON-native, API-native and accelerator-aware programming language concept.

JSON should be a first-class part of LogicN because modern applications commonly depend on REST APIs, webhooks, event streams, integrations, configuration, logs and AI tooling that use JSON as the main data format.

---

## JSON Design Summary

LogicN should make JSON:

```text
easy to receive
easy to validate
easy to decode
easy to transform
easy to stream
easy to output
easy to document
easy to secure
```

But LogicN should not become loosely typed because of JSON.

The core rule is:

```text
JSON is flexible at the boundary.
LogicN is strict inside the application.
```

---

## Core JSON Rule

Production code should prefer typed JSON decoding.

Preferred:

```LogicN
let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

ALOwed when needed:

```LogicN
let raw: Json = req.json()
let eventType: String = raw.path("$.type").asString()
```

Raw JSON should be useful, but typed JSON should be the normal safe path.

---

## JSON Grammar Interaction

JSON literals and JSON payloads are not a separate loose language inside LogicN.

LogicN code should interact with JSON through typed APIs, JSON policies and explicit raw JSON values:

```text
typed decode       = json.decode<T>(value)
typed partial read = json.pick<T>(value, path)
raw JSON           = Json
raw path access    = raw.path("$.field")
encoding           = json.encode(value)
streaming          = json.stream<T>(value)
JSON Lines         = jsonl.read<T>(path)
```

JSON object syntax may appear in examples and generated output, but application code should prefer declared LogicN types at API and webhook boundaries.

---

## Why JSON Matters

JSON is widely used in:

```text
REST APIs
webhooks
OpenAPI contracts
event streams
queue messages
configuration
logs
AI tool output
machine-readable reports
serverless functions
integration platforms
```

If LogicN handles JSON poorly, it will not be practical for modern backend systems.

---

## Design Goal

LogicN should be excellent at JSON-heavy systems.

The language should support:

```text
typed JSON decoding
raw JSON access
JSON schema generation
OpenAPI generation
JSON path access
partial JSON decoding
streaming JSON parsing
JSON Lines
canonical JSON output
safe redaction
schema validation
clear JSON errors
source-mapped JSON errors
AI-readable JSON reports
```

---

## JSON Types

LogicN should include core JSON types:

```text
Json
JsonObject
JsonArray
JsonString
JsonNumber
JsonBool
JsonNull
```

Example:

```LogicN
let payload: Json = req.json()
```

Raw JSON should be available at system boundaries.

Inside application logic, decode into strict LogicN types.

---

## Typed JSON Decoding

Example type:

```LogicN
type CreateOrderRequest {
  customerId: CustomerId
  items: Array<OrderItem>
  currency: Currency
}
```

Decode:

```LogicN
let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

If JSON does not match the expected type, LogicN should return a clear validation error.

---

## Decode Errors

Example invalid JSON:

```json
{
  "customerId": 123,
  "items": [],
  "currency": "GBP"
}
```

If `customerId` expects `CustomerId` based on `String`, the error should be clear:

```text
JSON decode error:
Expected customerId to be CustomerId/String.
Received Number.

Original source:
  src/routes.lln:18:21

JSON path:
  $.customerId

Suggestion:
  Send customerId as a string.
```

---

## Source-Mapped JSON Errors

JSON errors should map back to the LogicN code that attempted decoding.

Example:

```LogicN
let input: CreateOrderRequest = json.decode<CreateOrderRequest>(req.body)
```

Error:

```text
JSON decode error:
Missing required field `items`.

Original source:
  src/order-api.lln:22:35

JSON path:
  $.items
```

This makes JSON failures easier to debug.

---

## JSON Safety Policy

LogicN should support JSON safety policies.

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

This policy should protect against:

```text
huge payloads
deeply nested payloads
duplicate key ambiguity
unexpected null
missing fields
wrong types
unsafe number conversion
date parsing ambiguity
schema drift
secret leakage
```

---

## Payload Size Limits

Every API or webhook should have a maximum JSON body size.

Example:

```LogicN
max_body_size 1mb
```

Webhook example:

```LogicN
webhook PaymentWebhook {
  path "/webhooks/payment"
  method POST

  security {
    max_body_size 512kb
  }

  handler handlePaymentWebhook
}
```

This prevents memory exhaustion from large payloads.

---

## Maximum Depth

Deeply nested JSON can be used to exhaust parsers.

LogicN should aLOw:

```LogicN
max_depth 32
```

Example:

```LogicN
json_policy {
  max_depth 32
}
```

If payload depth exceeds the limit, LogicN should fail safely.

---

## Duplicate Keys

JSON objects with duplicate keys can be ambiguous.

Example:

```json
{
  "status": "paid",
  "status": "failed"
}
```

LogicN should allow policy control:

```LogicN
duplicate_keys "deny"
```

Recommended default:

```text
deny duplicate keys
```

---

## Unknown Fields

Unknown fields should be configurable.

Example:

```LogicN
unknown_fields "warn"
```

Possible settings:

```text
aLOw
warn
deny
```

For public APIs, `warn` may be useful.

For security-sensitive webhooks, `deny` may be safer.

---

## Null Fields

LogicN should not allow silent null.

JSON null should decode only where the LogicN type aLOws `Option<T>`.

Example:

```LogicN
type CustomerPayload {
  email: Option<Email>
}
```

Valid JSON:

```json
{
  "email": null
}
```

Invalid if type is not optional:

```LogicN
type CustomerPayload {
  email: Email
}
```

Expected error:

```text
JSON decode error:
Field `email` is null but expected Email.

Suggestion:
Use Option<Email> if null is aLOwed.
```

---

## Missing Fields

Missing required fields should fail validation.

Example type:

```LogicN
type CreateOrderRequest {
  customerId: CustomerId
  items: Array<OrderItem>
}
```

Invalid JSON:

```json
{
  "customerId": "cus_123"
}
```

Expected error:

```text
JSON decode error:
Missing required field `items`.

JSON path:
  $.items
```

---

## Optional Fields

Optional fields should use:

```LogicN
Option<T>
```

Example:

```LogicN
type CustomerPayload {
  id: CustomerId
  email: Option<Email>
}
```

Valid JSON:

```json
{
  "id": "cus_123"
}
```

The decoded value should be:

```LogicN
email = None
```

---

## Number Safety

JSON has one broad number type.

LogicN should prevent unsafe number conversions.

Examples:

```LogicN
let quantity: Int = json.decode<Int>(value)
let price: Decimal = json.decode<Decimal>(value)
let score: Float = json.decode<Float>(value)
```

LogicN should reject:

```text
fractional number into Int unless explicitly aLOwed
overflowing number
NaN where not aLOwed
Infinity where not aLOwed
money stored as unsafe Float
```

---

## Money in JSON

Money should be decoded safely.

Preferred JSON:

```json
{
  "amount": "100.00",
  "currency": "GBP"
}
```

LogicN type:

```LogicN
type MoneyPayload {
  amount: Decimal
  currency: Currency
}
```

Or:

```LogicN
type OrderTotal {
  total: Money<GBP>
}
```

LogicN should avoid using `Float` for money.

---

## Date and Time in JSON

LogicN should prefer clear date formats.

Recommended:

```text
ISO 8601
```

Policy:

```LogicN
json_policy {
  date_format "iso8601"
}
```

Example:

```json
{
  "createdAt": "2026-05-02T10:00:00Z"
}
```

Type:

```LogicN
type Event {
  createdAt: Timestamp
}
```

---

## Raw JSON Access

Raw JSON is useful when:

```text
the payload shape is unknown
the event type decides the shape
the app is acting as a proxy
only one field is needed
debugging or logging safely
```

Example:

```LogicN
let raw: Json = req.json()
let eventType: String = raw.path("$.type").asString()
```

Raw JSON should still foLOw safety limits.

---

## JSON Path

LogicN should support JSON path access.

Example:

```LogicN
let eventId: String = raw.path("$.id").asString()
let eventType: String = raw.path("$.type").asString()
```

If the path is missing or the type is wrong, LogicN should return a safe error or `Option<T>` depending on the method.

Possible forms:

```LogicN
raw.path("$.id").asString()
raw.path("$.customer.email").asOption<Email>()
```

---

## Partial JSON Decoding

LogicN should support decoding only part of a payload.

Example:

```LogicN
let eventType: String = json.pick<String>(req.body, "$.type")
```

This is useful for webhooks where the event type decides the target payload type.

Example:

```LogicN
let eventType: String = json.pick<String>(req.body, "$.type")

match eventType {
  "payment.succeeded" => {
    let event: PaymentSucceededEvent = json.decode<PaymentSucceededEvent>(req.body)
    handlePaymentSucceeded(event)
  }

  "payment.failed" => {
    let event: PaymentFailedEvent = json.decode<PaymentFailedEvent>(req.body)
    handlePaymentFailed(event)
  }

  _ => return JsonResponse({ "ignored": true })
}
```

---

## Streaming JSON

Large payloads should not require loading everything into memory.

LogicN should support streaming:

```LogicN
for item in json.stream<OrderItem>(req.body) {
  processItem(item)
}
```

Use cases:

```text
large imports
bulk API requests
analytics data
logs
event streams
batch processing
```

Streaming should still support:

```text
type validation
body limits
depth limits
source-mapped errors
safe cancellation
```

---

## JSON Lines

LogicN should support JSON Lines.

Example file:

```jsonl
{"id":"evt_1","type":"order.created"}
{"id":"evt_2","type":"order.cancelled"}
{"id":"evt_3","type":"payment.succeeded"}
```

LogicN example:

```LogicN
for event in jsonl.read<Event>("./events.jsonl") {
  processEvent(event)
}
```

Useful for:

```text
logs
audit trails
dead-letter queues
event exports
data imports
worker processing
```

---

## Canonical JSON Output

LogicN should support canonical JSON output where deterministic output matters.

Use cases:

```text
signing payloads
hashing payloads
testing
diffing generated files
deterministic builds
```

Possible command:

```LogicN
let canonical: String = json.canonicalEncode(payload)
```

---

## JSON Encoding

Typed LogicN values should encode to JSON safely.

Example:

```LogicN
let response = CreateOrderResponse {
  id: order.id
  decision: ALOw
  status: Created
}

return JsonResponse(response)
```

Explicit encoding:

```LogicN
let body: Json = json.encode(response)
let text: String = json.encodeString(response)
```

The compiler should ensure `CreateOrderResponse` can be serialised.

---

## Redaction

LogicN should support safe redaction for JSON.

Example:

```LogicN
let safePayload: Json = json.redact(payload, fields: [
  "$.password",
  "$.token",
  "$.apiKey"
])
```

Logs should use redacted JSON.

Bad:

```LogicN
log.info("Webhook payload", payload)
```

Good:

```LogicN
log.info("Webhook payload", json.redact(payload, fields: ["$.token"]))
```

---

## SecureString and JSON

`SecureString` values should not be serialised accidentally.

Invalid:

```LogicN
return JsonResponse({
  "apiKey": apiKey
})
```

Expected error:

```text
Security error:
Cannot serialise SecureString into JSON response.

Suggestion:
Return a redacted value or remove the field.
```

---

## JSON Schema Generation

LogicN should generate JSON schemas from LogicN types.

Example type:

```LogicN
type CreateOrderRequest {
  customerId: CustomerId
  items: Array<OrderItem>
  currency: Currency
}
```

Command:

```bash
LogicN schema CreateOrderRequest
```

Output:

```text
build/schemas/create-order-request.schema.json
```

---

## OpenAPI Generation

API contracts should generate OpenAPI output.

Example:

```LogicN
api OrdersApi {
  POST "/orders" {
    request CreateOrderRequest
    response CreateOrderResponse
    handler createOrder
  }
}
```

Generated output:

```text
build/app.openapi.json
```

This helps:

```text
frontend developers
integration partners
API testing
client generation
documentation
AI tools
```

---

## JSON and AI Tools

JSON-native design helps AI tools because compiler reports can be machine-readable.

Generated files:

```text
app.api-report.json
app.failure-report.json
app.security-report.json
app.target-report.json
app.ai-context.json
```

These should be compact, structured and safe to share.

---

## AI Context JSON

Example:

```json
{
  "project": "OrderRiskDemo",
  "routes": [
    "POST /orders",
    "POST /webhooks/payment"
  ],
  "types": [
    "CreateOrderRequest",
    "CreateOrderResponse",
    "PaymentWebhookEvent"
  ],
  "jsonPolicies": {
    "maxBodySize": "1mb",
    "maxDepth": 32,
    "duplicateKeys": "deny"
  }
}
```

This reduces the need to paste large source files into AI tools.

---

## JSON Error Reports

JSON validation errors should be machine-readable.

Example:

```json
{
  "errorType": "JsonDecodeError",
  "file": "src/routes.lln",
  "line": 18,
  "column": 21,
  "jsonPath": "$.customerId",
  "expected": "CustomerId/String",
  "actual": "Number",
  "problem": "customerId must be a string",
  "suggestedFix": "Send customerId as a string value."
}
```

---

## API Report JSON

LogicN should generate API reports.

Example:

```json
{
  "routes": [
    {
      "method": "POST",
      "path": "/orders",
      "request": "CreateOrderRequest",
      "response": "CreateOrderResponse",
      "handler": "createOrder",
      "timeout": "5s",
      "maxBodySize": "1mb"
    }
  ]
}
```

---

## JSON Transform Design

LogicN should support clear transformation from one JSON-shaped type to another.

Example:

```LogicN
transform ShopifyOrder -> InternalOrder {
  id = source.id
  customerId = source.customer.id
  total = Money<GBP>(source.total_price)
  email = source.customer.email
  items = source.line_items.map(toInternalItem)
}
```

This is useful for:

```text
API integrations
webhook providers
data imports
ETL pipelines
integration platforms
```

---

## JSON Transform Safety

Transforms should be typed.

If a source field does not exist, the compiler should warn where possible.

If a target field is missing, the compiler should fail.

Example error:

```text
Transform error:
Target field `customerId` is not assigned.

Transform:
  ShopifyOrder -> InternalOrder
```

---

## JSON and Webhooks

Webhook payloads are often JSON.

LogicN should make secure webhook JSON easy:

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

Handler:

```LogicN
secure flow handlePaymentWebhook(req: Request) -> Result<Response, WebhookError> {
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

## JSON and Queues

LogicN should support JSON queue/event messages.

Example:

```LogicN
channel orders: Channel<OrderEvent> {
  buffer 1000
  overflow "dead_letter"
  dead_letter "./storage/dead/orders.jsonl"
}
```

Dead-letter queues may use JSON Lines:

```text
storage/dead/orders.jsonl
```

---

## JSON and Logs

Structured logs should normally be JSON.

Example:

```LogicN
log.info("Order received", {
  orderId: order.id
  decision: decision
})
```

Secrets should be redacted automatically where possible.

---

## JSON and Build Reports

LogicN compiler reports should be JSON.

Recommended reports:

```text
app.failure-report.json
app.security-report.json
app.target-report.json
app.api-report.json
app.ai-context.json
app.build-manifest.json
```

This makes LogicN easy to integrate with:

```text
CI/CD
AI assistants
security tooling
deployment tooling
monitoring systems
```

---

## JSON and Source Maps

JSON errors should work with source maps.

Example:

```text
JSON decode error in compiled app.bin

Original source:
  src/routes.lln:18:21

JSON path:
  $.customerId
```

This is essential for compiled LogicN apps.

---

## JSON and Performance

LogicN should optimise JSON handling where possible.

Potential features:

```text
streaming parser
zero-copy parsing where safe
typed decoding
partial decoding
schema-aware decoding
canonical output
generated validators
compiled schema checks
```

Performance should not weaken safety.

---

## JSON and Memory Safety

Large JSON can cause memory issues.

LogicN should provide:

```text
max body size
max depth
streaming decode
bounded buffers
safe cancellation
backpressure
dead-letter handling
```

---

## JSON and Security

JSON handling should prevent:

```text
payload bombs
deep nesting attacks
duplicate key ambiguity
unsafe number conversion
unexpected null
secret leakage
schema confusion
unvalidated webhook payloads
```

---

## JSON Non-Goals

LogicN should not:

```text
become dynamically typed because JSON is dynamic
silently coerce JSON numbers into unsafe types
silently ignore dangerous duplicate keys
silently accept null for non-optional fields
log raw secret-filled payloads by default
decode huge payloads without limits
```

---

## Open JSON Questions

```text
Should JSON null automatically map to None?
Should direct raw JSON path access return Result<T, Error> or Option<T>?
Should JSON schemas be generated by default during build?
Should OpenAPI output be generated by default for API projects?
```

---

## Final JSON Principle

LogicN should be one of the best languages for safe JSON-heavy systems.

The language should make JSON work:

```text
strict
safe
fast
clear
source-mapped
API-friendly
AI-friendly
deployment-friendly
```

JSON should be easy to use at the boundary, but strict and validated before it enters core application logic.
