# 469 — Financial payment flow with full 16-section contract

Demonstrates all 16 contract sections in a financial payment context.

Key governance points for financial flows:
- errors.redact { ApiError.Internal } — never expose internal errors to caller
- errors.audit { ApiError.Unauthorised, ApiError.ServiceUnavailable } — all security events audited
- privacy.retention 10 years — financial data retention requirement
- errors.map PaymentProviderError to ApiError.ServiceUnavailable — domain errors mapped to safe API errors
- response.denies { amount recipientId internalError } — financial PII never leaks through API
- retries.database.write { attempts 1 } — write idempotency (no retry on write)
- observability.deny request body logging — payment details never in logs
- require signed attestation — financial audit trail integrity

Naming convention: `readonly request: Request` not `req`. Local bindings use `raw` prefix for unsafe boundary data.
