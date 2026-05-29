# 213 — Governance summary example

**Concept:** Comprehensive governance example showing all patterns

This example demonstrates all Level 5 governance patterns together:

- intent — declares the allowed purpose
- with effects — declares all operational and audit effects
- compute target — restricts execution to on-premises CPU, denies remote
- uthority — grants permission to share protected data with NHS Spine
- policy — declares the purpose and which protected data may go where
- Trust chain — unsafe -> alidate -> protected -> edact -> audit
- AuditLog.write — provides the required audit evidence with timestamp

**AI rule:** Governance = intent + effects + compute target + uthority + policy + audit evidence.
