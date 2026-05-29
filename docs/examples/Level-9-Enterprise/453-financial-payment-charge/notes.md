# 453 — Financial payment charge

**Concept:** payment governance flow with approved merchant, Money type, and audit

The payment-charge pattern: a `guarded flow` validates the amount as `Money<GBP>` and the merchant as a `protected MerchantId`, charges via the payment gateway, and writes a redacted audit entry. Effects `payment.charge` and `audit.write` are declared, and an `intent` clause documents the governance contract.

**AI rule:** All payment flows must declare `payment.charge` and `audit.write` effects and include an `intent` clause.
