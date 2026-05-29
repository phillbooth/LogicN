# 171 — Protected value in console log

**Concept:** protected value sent to console sink is forbidden

print(email) would expose a protected Email to the console — an uncontrolled sink. The compiler rejects this. Redact first or omit the sensitive field entirely.

**AI rule:** Protected values cannot be printed to the console. Redact first or omit.
