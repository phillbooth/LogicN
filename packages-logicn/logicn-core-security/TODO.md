# LogicN Security TODO

```text
[x] Create /packages-logicn/logicn-core-security
[x] Add README.md
[x] Add TODO.md
[x] Add package metadata
[x] Add initial typed exports
[x] Define SecureString helper model
[x] Define redaction primitive rules
[x] Define permission model types
[ ] Define SecretReference interface (name/required/scope/fingerprint?/allowedOperation?/protected:true)
[ ] Define SecretDerivedReference interface (source/derivedKind/protected:true)
[ ] Define SecureStringReference interface (label/redacted:true/fingerprint?)
[ ] Implement ProtectedSecret class — toString() returns "[REDACTED]", useWithApprovedSink() for safe access
[ ] Define SecretSafeSink interface (name/kind:"network"|"crypto"|"database"|"token"/approved:boolean)
[ ] Implement canSendSecretToSink(secret, sink): boolean
[ ] Implement redactSecretValue(value: string): RedactionResult — fails closed
[ ] Define LN-SECRET-001 (required secret unavailable) and LN-SECRET-002 (unsafe sink flow)
[ ] Ensure SecretReference protected marker prevents accidental string serialization
[ ] Define policy definition, effective policy and conflict report schemas
[ ] Define capability boundary and grant report schemas
[ ] Define capability lease, attenuation and approver-chain diagnostics
[ ] Define AI self-grant and trust-root modification diagnostics
[ ] Define malicious data validation and taint-flow diagnostics
[ ] Define OWASP/CWE baseline diagnostic mapping
[ ] Define hardware-risk security report inputs
[x] Define security diagnostic format
[x] Define security report contract
[x] Define safe token, cookie and header handling helpers
[x] Define cryptographic policy types
[ ] Define crypto inventory and post-quantum readiness report schemas
[ ] Define SecureRandom versus Random diagnostic examples
[x] Add examples
[x] Add tests
```
