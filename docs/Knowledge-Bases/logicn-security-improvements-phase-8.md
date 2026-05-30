# LogicN Security Improvements — Phase 8

## Status

```text
Phase 8B implementation targets
Adopted: all three
Priority: Very High
```

## TL;DR
- String concatenation (`+`) must propagate unsafe taint — `"SELECT " + rawInput` → tainted String
- Secret `Bytes` (HMAC, tokens) need constant-time comparison just like `SecureString`
- Protected values in API response bodies require explicit policy authorization

---

## 1. String Taint Propagation (LLN-VALUESTATE-004)

String concatenation must propagate unsafe taint. If either operand is `unsafe`,
the result is `unsafe`. This is the SQL injection pattern.

### Tainted (must emit LLN-VALUESTATE-004 at sink)

```logicn
unsafe let rawEmail: String = request.body.email
let query: String = "SELECT * FROM users WHERE email = '" + rawEmail + "'"
Database.query(query)?   // LLN-VALUESTATE-004
```

### Safe

```logicn
unsafe let rawEmail: String = request.body.email
let email: protected Email = validate.email(rawEmail)?
Database.queryParameterized("SELECT * FROM users WHERE email = ?", [email])?
```

### Taint propagation rule

| Expression | Result state |
|---|---|
| `"prefix" + rawInput` | unsafe String |
| `rawInput + "suffix"` | unsafe String |
| `safeString + rawInput` | unsafe String |
| `sanitize.text(rawInput) + "suffix"` | safe String |
| `validate.email(rawInput)?` | protected Email |

### Phase 8B implementation

Update operator type checker to track unsafe state through binary `+` on strings.
If result flows to a governed sink, emit LLN-VALUESTATE-004.

---

## 2. Constant-Time Comparison for Secret Bytes (LLN-SECRET-002)

Secret values are not always strings. HMAC digests, API token bytes, and signature
bytes are `Bytes` type. Normal equality comparison is vulnerable to timing attacks.

### Tainted

```logicn
let expected: Bytes = Hmac.sign(secretKey, payload)
let supplied: Bytes = request.headers.signature
if expected == supplied {   // LLN-SECRET-002
  return Ok()
}
```

### Safe

```logicn
let expected: Bytes = Hmac.sign(secretKey, payload)
let supplied: Bytes = request.headers.signature
if constantTimeEquals(expected, supplied) {
  return Ok()
}
```

### Phase 8B implementation

Extend LLN-SECRET-002 to cover Bytes values that are provenance-tracked as
secret-derived. The value-state checker must track `secret.read` provenance
through assignments, not only through nominal type `SecureString`.

---

## 3. Protected Values in Response Bodies (LLN-GOV-003)

A protected binding returned in `Response.ok(...)` is an outward-facing exposure.
Valid ≠ shareable. The compiler must require explicit policy authorization.

### Tainted

```logicn
// No policy block — LLN-GOV-003
return Ok(Response.ok({ email: email }))
```

### Safe (redacted)

```logicn
return Ok(Response.ok({ email: redact(email) }))
```

### Safe (policy authorized)

```logicn
policy {
  allow protected Email to response
  reason "Patient is viewing their own profile"
  require audit.write
}
return Ok(Response.ok({ email: email }))
```

### Phase 8B implementation

Add `Response.ok(...)` and `Response.created(...)` to the governed sink registry.
Require: safe, redacted, or policy-authorized. Deny: unredacted protected, unsafe.

---

## See Also

- `docs/Knowledge-Bases/stdlib-gates.yaml` — updated with response_sinks and taint_propagation_rules
- `docs/Knowledge-Bases/operator-rules.schema.yaml` — updated with taint rules
- `docs/Knowledge-Bases/value-state-annotations.md`
- `docs/Knowledge-Bases/logicn-governance-verifier-spec.md`
