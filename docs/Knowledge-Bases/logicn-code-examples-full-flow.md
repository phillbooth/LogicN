# LogicN — Full Flow Code Examples

Intent, governance, safe/unsafe boundaries, audit proof and the complete
governance model shown in practical code.

These examples are written as **proposed/full LogicN syntax** — the complete
language as intended, not the current Node.js prototype subset. They show how
`intent`, `governance`, `safe`/`unsafe` flows, `readonly`, `let mut`, tainted
input, runtime target planning, negative guarantees and audit proof all compose
into real programs.

---

## Syntax Used in These Examples

```logicn
intent        — declares semantic purpose, required authority, denied behaviors
governance    — declares effects, capabilities, resources, runtime policy
safe flow     — flow that stays within governed safe runtime rules
unsafe flow   — flow crossing a native, external, or trust-changing boundary
let           — immutable binding (default)
let mut       — mutable binding, explicitly visible at the declaration site
readonly      — parameter passed as read-only view; caller retains ownership
Tainted<T>    — input that has not yet been sanitized; cannot go to typed sinks
audit { }     — declares what evidence the runtime must produce or verify
```

---

## 1. API Response — Read Order Status

Receives an API request, reads an order from the database, and returns a
governed response with structured audit evidence.

```logicn
intent GetOrderStatus {
  purpose "Return the current status of a customer order"

  requires [orders.read]

  denies [
    database.write,
    payment.charge,
    filesystem.write,
    process.spawn,
    network.unlisted
  ]

  produces [OrderStatusReturned]
}

governance GetOrderStatusGovernance {
  effects     [database.read, audit.write]
  capabilities [orders.read]
  resources   [OrdersDB, AuditLog]

  denies [database.write, filesystem.write, process.spawn]

  runtime {
    memory request_scoped
    secret_redaction enabled
  }
}

api OrdersApi {
  GET "/orders/{orderId}/status" {
    handler  getOrderStatus
    request  GetOrderStatusRequest
    response ApiResponse<OrderStatusResponse>
  }
}

safe flow getOrderStatus(
  readonly request: GetOrderStatusRequest
) -> Result<ApiResponse<OrderStatusResponse>, ApiError>
intent    GetOrderStatus
governance GetOrderStatusGovernance
audit {
  require [
    capability_verified,
    database_read_recorded,
    response_emitted,
    no_denied_effects
  ]
} {
  let orderId: OrderId = request.orderId

  let order: Order = OrdersDB.findById(orderId)?

  let response = OrderStatusResponse {
    orderId:   order.id,
    status:    order.status,
    updatedAt: order.updatedAt
  }

  AuditLog.write({
    event:   "OrderStatusReturned",
    orderId: order.id
  })

  return Ok(ApiResponse.ok(response))
}
```

**Example API response:**

```json
{
  "ok": true,
  "data": {
    "orderId": "ord_123",
    "status": "processing",
    "updatedAt": "2026-05-28T10:15:00Z"
  },
  "audit": {
    "intent": "GetOrderStatus",
    "capabilitiesVerified": ["orders.read"],
    "effectsExecuted": ["database.read", "audit.write"],
    "deniedEffectsTriggered": []
  }
}
```

---

## 2. Desktop User — Unsafe Host API Boundary

Reads the current signed-in OS user. Marked `unsafe` because it crosses into
host OS / platform-specific native APIs. A safe wrapper exposes only the
permitted fields to application code.

```logicn
intent GetDesktopUser {
  purpose "Read the current signed-in desktop user"

  requires [desktop.user.read]

  denies [
    network.external,
    database.write,
    filesystem.write,
    process.spawn
  ]

  produces [DesktopUserLoaded]
}

governance DesktopUserGovernance {
  effects     [desktop.user.read, audit.write]
  capabilities [desktop.user.read]
  resources   [DesktopSession, AuditLog]

  denies [network.external, process.spawn, filesystem.write]

  runtime {
    target desktop
    memory request_scoped
    secret_redaction enabled
  }
}

// Unsafe: crosses into host OS runtime APIs.
// May behave differently on Windows, macOS, Linux.
unsafe flow readDesktopUserFromHost()
  -> Result<DesktopUser, DesktopUserError>
effects     [desktop.user.read, unsafe.host_api]
capabilities [desktop.user.read]
audit {
  require [unsafe_boundary_recorded, capability_verified]
} {
  let user = Host.currentUser()?

  return Ok(DesktopUser {
    id:            user.id,
    displayName:   user.displayName,
    homeDirectory: user.homeDirectory
  })
}

// Safe wrapper — most application code calls this, not the unsafe flow directly.
// Exposes only permitted fields; homeDirectory is omitted from the public view.
safe flow getDesktopUser()
  -> Result<DesktopUserView, DesktopUserError>
intent    GetDesktopUser
governance DesktopUserGovernance
audit {
  require [
    unsafe_boundary_recorded,
    no_network_access,
    no_filesystem_write,
    result_returned
  ]
} {
  let user = readDesktopUserFromHost()?

  let view = DesktopUserView {
    id:          user.id,
    displayName: user.displayName
    // homeDirectory intentionally omitted
  }

  AuditLog.write({ event: "DesktopUserLoaded", userId: user.id })

  return Ok(view)
}
```

---

## 3. Form Submission — Tainted Input Handling

Receives a form submission from an external API. Input is `Tainted<T>` — it
cannot reach the database until explicitly sanitized through a pure flow.

```logicn
intent SaveContactForm {
  purpose "Validate and store a submitted contact form"

  requires [forms.create, database.write]

  denies [
    payment.charge,
    process.spawn,
    filesystem.write,
    network.unlisted
  ]

  produces [ContactFormSaved]
}

governance SaveContactFormGovernance {
  effects     [input.external, database.write, audit.write]
  capabilities [forms.create, database.write]
  resources   [ContactFormsDB, AuditLog]

  denies [payment.charge, filesystem.write, process.spawn]

  runtime {
    memory request_scoped
    secret_redaction enabled
  }
}

// Tainted<T> marks input as boundary-origin.
// It cannot be passed to typed database sinks without going through sanitization.
type ContactFormRequest = {
  name:    Tainted<String>
  email:   Tainted<String>
  message: Tainted<String>
}

type SanitizedContactForm = {
  name:    String
  email:   EmailAddress
  message: String
}

// Pure sanitizer — zero effects. Compiler enforces this.
safe pure flow sanitizeContactForm(
  readonly input: ContactFormRequest
) -> Result<SanitizedContactForm, ValidationError>
effects      []
capabilities [] {
  let name    = sanitize.text(input.name)?
  let email   = sanitize.email(input.email)?
  let message = sanitize.text(input.message)?

  if message.length > 2000 {
    return Err(ValidationError.TooLong("message"))
  }

  return Ok(SanitizedContactForm { name, email, message })
}

api FormsApi {
  POST "/forms/contact" {
    handler  saveContactForm
    request  ContactFormRequest
    response ApiResponse<FormSavedResponse>
  }
}

safe flow saveContactForm(
  readonly request: ContactFormRequest
) -> Result<ApiResponse<FormSavedResponse>, ApiError>
intent    SaveContactForm
governance SaveContactFormGovernance
audit {
  require [
    tainted_input_sanitized,
    database_write_recorded,
    audit_event_written,
    no_denied_effects
  ]
} {
  // Input is Tainted here — must be sanitized before database.write.
  let form = sanitizeContactForm(request)?

  // Explicit mut makes local state changes visible.
  let mut status: FormStatus = FormStatus.PendingReview

  if form.email.domain == "trusted.example" {
    status = FormStatus.AutoApproved
  }

  let saved = ContactFormsDB.insert({
    name:    form.name,
    email:   form.email,
    message: form.message,
    status:  status
  })?

  AuditLog.write({ event: "ContactFormSaved", formId: saved.id })

  return Ok(ApiResponse.created(FormSavedResponse {
    formId: saved.id,
    status: status
  }))
}
```

---

## 4. Pure Calculation — Zero Effects

A pure, deterministic invoice calculation. No effects, no capabilities, no
database or network access. Can be compile-time evaluated when called with
literal arguments.

```logicn
intent CalculateInvoiceTotal {
  purpose "Calculate invoice total from subtotal, tax, and discount"

  requires []

  denies [
    database.read,
    database.write,
    network.external,
    filesystem.write,
    secret.read,
    process.spawn
  ]

  produces [InvoiceTotalCalculated]
}

governance PureCalculationGovernance {
  effects      []
  capabilities []
  resources    []

  denies [
    database.read, database.write, network.external,
    filesystem.write, secret.read, process.spawn
  ]

  runtime { deterministic true }
}

safe pure flow calculateInvoiceTotal(
  readonly subtotal: Money,
  readonly taxRate:  Decimal,
  readonly discount: Money
) -> Money
intent    CalculateInvoiceTotal
governance PureCalculationGovernance
audit {
  require [deterministic_execution, no_effects]
} {
  let tax   = subtotal * taxRate
  let total = subtotal + tax - discount

  return Money.round(total)
}
```

Usage:

```logicn
let total = calculateInvoiceTotal(
  subtotal: Money.gbp(100.00),
  taxRate:  0.20,
  discount: Money.gbp(10.00)
)
// total = £110.00
```

---

## 5. Webhook Signature Verification — Constant-Time Secret Comparison

Verifies a webhook signature using HMAC. The `==` operator on secrets is
rejected by the compiler — timing-safe `constantTimeEquals` is required.

```logicn
intent VerifyWebhookSignature {
  purpose "Verify that a webhook payload came from the expected provider"

  requires [secret.read, webhook.verify]

  denies [filesystem.write, process.spawn, network.external]

  produces [WebhookSignatureVerified]
}

governance WebhookGovernance {
  effects     [secret.read, audit.write]
  capabilities [webhook.verify]
  resources   [SecretVault, AuditLog]

  denies [filesystem.write, process.spawn, network.external]
}

safe flow verifyWebhookSignature(
  readonly payload:           Bytes,
  readonly providedSignature: ProtectedSecret<Bytes>
) -> Result<VerifiedWebhook, WebhookError>
intent    VerifyWebhookSignature
governance WebhookGovernance
audit {
  require [
    constant_time_comparison,
    secret_not_logged,
    no_secret_declassification
  ]
} {
  let signingSecret = vault.secret("WEBHOOK_SIGNING_SECRET")

  let expectedSignature = crypto.hmacSha256(
    key:  signingSecret,
    data: payload
  )

  // REJECTED by compiler:
  //   if expectedSignature == providedSignature { ... }
  //   → LLN-SAFETY-001: timing-unsafe comparison on ProtectedSecret
  //
  // CORRECT: timing-safe comparison
  let valid = expectedSignature.constantTimeEquals(providedSignature)

  if !valid {
    return Err(WebhookError.InvalidSignature)
  }

  AuditLog.write({ event: "WebhookSignatureVerified" })

  return Ok(VerifiedWebhook(payload))
}
```

---

## 6. Local AI Inference — Governed NPU Target Planning

Fraud scoring using a local model. The intent explicitly denies
`remote.execution` — this becomes a negative guarantee enforced at runtime and
confirmed in the audit proof.

```logicn
intent LocalFraudScoring {
  purpose "Calculate fraud risk score locally without remote inference"

  requires [ai.inference, fraud.score]

  // Negative guarantee: cloud inference is not permitted.
  denies [
    remote.execution,
    network.external,
    filesystem.write,
    process.spawn
  ]

  produces [FraudScoreCalculated]
}

governance LocalFraudGovernance {
  effects     [ai.inference, npu.compute, audit.write]
  capabilities [fraud.score, compute.npu]
  resources   [LocalFraudModel, AuditLog]

  denies [remote.execution, network.external, process.spawn]

  runtime {
    local_execution_only true
    memory request_scoped
  }
}

safe flow scoreFraud(
  readonly transaction: Transaction
) -> Result<FraudScore, FraudError>
intent    LocalFraudScoring
governance LocalFraudGovernance
audit {
  require [
    local_execution_verified,
    runtime_target_recorded,
    no_remote_execution,
    no_network_access
  ]
} {
  compute target best {
    prefer [npu, gpu, cpu]

    // Remote fallback is intentionally absent from the prefer list.
    // The deny here matches the intent's negative guarantee.
    deny [remote.execution]

    let score = LocalFraudModel.run(transaction)
  }

  AuditLog.write({ event: "FraudScoreCalculated" })

  return Ok(score)
}
```

**Audit evidence:**

```yaml
audit:
  intent:          LocalFraudScoring
  selectedTarget:  npu
  provider:        apple_ane
  remoteExecution: none
  networkAccess:   none
  governanceViolations: none
```

---

## 7. Native Image Processing — Unsafe Boundary with Safe Wrapper

An unsafe native image resize call (FFI to a C image library) is isolated and
wrapped in a safe governed flow. Application code calls the safe wrapper only.

```logicn
intent ResizeUserAvatar {
  purpose "Resize an uploaded user avatar image"

  requires [image.process, filesystem.temp]

  denies [network.external, payment.charge, secret.read]

  produces [AvatarResized]
}

governance AvatarGovernance {
  effects     [filesystem.temp, image.process, audit.write]
  capabilities [image.process]
  resources   [TempImageBuffer, AuditLog]

  denies [network.external, payment.charge, secret.read]

  runtime {
    sandbox required
    memory request_scoped
  }
}

// Unsafe: crosses into native image library code.
// Required: reason (implicit from unsafe native declaration) + sandbox.
unsafe native flow resizeImageNative(
  readonly image:  Bytes,
  readonly width:  Int,
  readonly height: Int
) -> Result<Bytes, ImageError>
effects     [unsafe.native, filesystem.temp, image.process]
capabilities [image.process]
audit {
  require [unsafe_boundary_recorded, sandbox_verified]
} {
  return NativeImage.resize(image, width, height)
}

// Safe wrapper validates input constraints before crossing the unsafe boundary.
safe flow resizeUserAvatar(
  readonly upload: UploadedFile
) -> Result<AvatarImage, ImageError>
intent    ResizeUserAvatar
governance AvatarGovernance
audit {
  require [
    unsafe_boundary_recorded,
    sandbox_verified,
    no_network_access,
    no_secret_access
  ]
} {
  if upload.sizeBytes > 2_000_000 {
    return Err(ImageError.FileTooLarge)
  }

  let resized = resizeImageNative(
    image:  upload.bytes,
    width:  256,
    height: 256
  )?

  AuditLog.write({ event: "AvatarResized" })

  return Ok(AvatarImage(resized))
}
```

---

## 8. User Profile Update — readonly Input and Explicit mut

Shows `readonly` input binding and explicit `let mut` for a draft object.
Mutations are visible because `draft` is declared `let mut`.

```logicn
intent UpdateUserProfile {
  purpose "Update safe editable fields on a user profile"

  requires [user.write]

  denies [payment.charge, secret.read, process.spawn]

  produces [UserProfileUpdated]
}

governance UserProfileGovernance {
  effects     [database.read, database.write, audit.write]
  capabilities [user.write]
  resources   [UsersDB, AuditLog]

  denies [payment.charge, secret.read, process.spawn]
}

safe flow updateUserProfile(
  readonly request: UpdateUserProfileRequest
) -> Result<UserProfileResponse, UserError>
intent    UpdateUserProfile
governance UserProfileGovernance
audit {
  require [
    database_write_recorded,
    audit_event_written,
    no_denied_effects
  ]
} {
  let existing = UsersDB.findById(request.userId)?

  // Explicit mutable draft — mutations are visible at the declaration site.
  let mut draft = existing.profile

  draft.displayName = sanitize.text(request.displayName)?
  draft.bio         = sanitize.text(request.bio)?

  let saved = UsersDB.updateProfile(request.userId, draft)?

  AuditLog.write({ event: "UserProfileUpdated", userId: request.userId })

  return Ok(UserProfileResponse(saved))
}
```

---

## 9. Negative Guarantee — Filesystem Write Blocked by Intent

A report-view flow whose intent explicitly denies `filesystem.write`. Any
attempt to write a file is rejected at compile time with `LLN-INTENT-001`.

```logicn
intent ViewReportOnly {
  purpose "Generate a report for viewing only"

  requires [report.read]

  denies [filesystem.write, network.external, process.spawn]

  produces [ReportViewed]
}

governance ViewReportGovernance {
  effects     [database.read]
  capabilities [report.read]
  resources   [ReportsDB]

  denies [filesystem.write, network.external, process.spawn]
}

safe flow viewReport(
  readonly reportId: ReportId
) -> Result<ReportView, ReportError>
intent    ViewReportOnly
governance ViewReportGovernance
audit {
  require [no_filesystem_write, no_network_access]
} {
  let report = ReportsDB.findById(reportId)?

  // REJECTED at compile time:
  //   FileSystem.write("/tmp/report.csv", report.csv)
  //   → LLN-INTENT-001: filesystem.write denied by ViewReportOnly

  return Ok(ReportView(report))
}
```

---

## 10. Package Governance — Authority Propagation from Import

Importing a package introduces its authority into the calling module. The
governance diff shows exactly what authority enters with the import.

```logicn
intent UsePaymentAdapter {
  purpose "Charge a payment using approved payment adapter"

  requires [payment.charge]

  denies [filesystem.write, process.spawn]
}

// Package manifest exposes governance metadata — visible to the intent graph.
package "@logicn/stripe-adapter" {
  effects      [network.external, secret.read, payment.charge]
  capabilities [payment.charge]
  resources    [StripeAPI, SecretVault]
}

import StripeAdapter from "@logicn/stripe-adapter"

governance PaymentAdapterGovernance {
  effects     [network.external, secret.read, payment.charge, audit.write]
  capabilities [payment.charge]
  resources   [StripeAPI, SecretVault, AuditLog]

  denies [filesystem.write, process.spawn]
}

safe flow chargeCustomer(
  readonly payment: PaymentRequest
) -> Result<PaymentReceipt, PaymentError>
intent    UsePaymentAdapter
governance PaymentAdapterGovernance
audit {
  require [
    package_authority_recorded,
    secret_access_recorded,
    external_network_recorded
  ]
} {
  let receipt = StripeAdapter.charge(payment)?

  AuditLog.write({ event: "PaymentCharged", paymentId: receipt.id })

  return Ok(receipt)
}
```

**Governance diff on adding this import:**

```text
Importing @logicn/stripe-adapter introduces:
  + network.external
  + secret.read
  + payment.charge
  + StripeAPI resource access
  + SecretVault resource access
```

---

## 11. Audit Proof Record

What the runtime generates after executing `chargeCustomer` (example 10):

```yaml
auditProof:
  flow:   chargeCustomer
  intent: UsePaymentAdapter

  capabilitiesUsed:
    - payment.charge

  effectsExecuted:
    - secret.read
    - network.external
    - payment.charge
    - audit.write

  resourcesAccessed:
    - SecretVault
    - StripeAPI
    - AuditLog

  deniedEffectsTriggered: none
  unsafeBoundaries:       none
  governanceViolations:   none

  status: verified
```

---

## 12. Full Flow — API Request to Audit Proof

A complete governed flow from external HTTP input through tainted input
sanitization to database write and structured audit proof.

```logicn
intent CreateSupportTicket {
  purpose "Create a support ticket from customer-submitted API data"

  requires [ticket.create, database.write]

  denies [payment.charge, process.spawn, filesystem.write]

  produces [SupportTicketCreated]
}

governance SupportTicketGovernance {
  effects     [input.external, database.write, audit.write]
  capabilities [ticket.create, database.write]
  resources   [SupportTicketsDB, AuditLog]

  denies [payment.charge, process.spawn, filesystem.write]

  runtime {
    memory request_scoped
    secret_redaction enabled
  }
}

// Tainted input from the external API.
type SupportTicketRequest = {
  subject: Tainted<String>
  body:    Tainted<String>
  email:   Tainted<String>
}

// Pure sanitizer — zero effects, compiler-enforced.
safe pure flow sanitizeTicket(
  readonly input: SupportTicketRequest
) -> Result<SanitizedTicket, ValidationError>
effects      []
capabilities [] {
  return Ok(SanitizedTicket {
    subject: sanitize.text(input.subject)?,
    body:    sanitize.text(input.body)?,
    email:   sanitize.email(input.email)?
  })
}

safe flow createSupportTicket(
  readonly request: SupportTicketRequest
) -> Result<ApiResponse<TicketCreatedResponse>, TicketError>
intent    CreateSupportTicket
governance SupportTicketGovernance
audit {
  require [
    tainted_input_sanitized,
    database_write_recorded,
    audit_event_written,
    no_denied_effects
  ]
} {
  // Tainted input sanitized before any database operation.
  let ticket = sanitizeTicket(request)?

  let saved = SupportTicketsDB.insert(ticket)?

  AuditLog.write({ event: "SupportTicketCreated", ticketId: saved.id })

  return Ok(ApiResponse.created(TicketCreatedResponse {
    ticketId: saved.id
  }))
}
```

**API response:**

```json
{
  "ok": true,
  "data": { "ticketId": "ticket_123" },
  "audit": {
    "intent": "CreateSupportTicket",
    "taintedInputSanitized": true,
    "effectsExecuted": ["input.external", "database.write", "audit.write"],
    "deniedEffectsTriggered": []
  }
}
```

---

## Summary

These examples show all major LogicN governance concepts in combination:

| Concept | Demonstrated in |
|---|---|
| `intent` block | All examples |
| `governance` block | All examples |
| `safe flow` | 1, 2, 3, 4, 5, 6, 8, 9, 10, 12 |
| `unsafe flow` / `unsafe native` | 2, 7 |
| `readonly` parameter | 1, 3, 4, 5, 7, 8, 9, 10, 12 |
| `let mut` explicit mutation | 3, 8 |
| `Tainted<T>` boundary input | 3, 12 |
| Pure sanitizer flow | 3, 12 |
| Runtime target planning (`compute target best`) | 6 |
| Negative guarantees (`denies`) | 1, 4, 6, 9 |
| Package authority propagation | 10 |
| Audit proof record | 1, 6, 11 |
| Constant-time secret comparison | 5 |

LogicN code declares not just *what to execute* but:

```text
why execution exists       → intent
what authority it needs    → requires
what it must never do      → denies
what boundaries it crosses → unsafe flow / Tainted<T>
what evidence it produces  → audit { require [...] }
```

That is the core of LogicN's governed programming model.

---

## Related Documents

| Document | Notes |
|---|---|
| [logicn-concept-intent.md](logicn-concept-intent.md) | Full intent specification |
| [logicn-concept-governed-execution-plan.md](logicn-concept-governed-execution-plan.md) | Governed execution plan specification |
| [logicn-concept-audit-proof.md](logicn-concept-audit-proof.md) | Audit proof specification |
| [logicn-governance-architecture.md](logicn-governance-architecture.md) | Full 23-stage governance pipeline |
| [compiler-diagnostics.md](compiler-diagnostics.md) | `LLN-INTENT-*`, `LLN-SAFETY-*` diagnostic codes |
