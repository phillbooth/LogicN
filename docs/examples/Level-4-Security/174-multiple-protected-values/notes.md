# 174 — Multiple protected values

**Concept:** Multiple protected values all validated and redacted in audit

When a flow handles multiple sensitive fields, each must be individually validated and individually redacted. The pattern scales naturally: one alidate.* call and one edact() call per sensitive field.

**AI rule:** Each protected value must be individually validated and individually redacted for audit.
