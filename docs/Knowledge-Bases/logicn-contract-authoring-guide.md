# LogicN — Contract Authoring Guide (the canonical reference for AI + humans)

**This is the authoritative reference for writing a correct LogicN `contract { }`.** AI tools
generating LogicN, and humans reviewing it, should follow this. It corrects the common
mistakes of treating `types` / `request` / `response` as globally mandatory, and of letting an
AI silently widen its own authority/effects/secrets.

## The single most important rule (AI safety)

**An AI may only PROPOSE a widening of `authority`, `effects`, or `secrets`. It must never
apply one itself.** Auto-expanding these is the definition of **privilege escalation**.
The pipeline is **propose → verify → approve**:
1. **AI proposes** — writes the change to a `*.logicn.proposal` artifact, never to a production
   `.logicn` file.
2. **Compiler verifies** — `logicn --check-proposal` hard-errors if a proposed `effects` block
   doesn't match the function's actual AST (you can't declare an effect the code doesn't do, or
   omit one it does).
3. **Policy engine authorizes** — rejects proposals that cross global boundaries (e.g. adding a
   `network allow` to an internal crypto module).
4. **Human approves** — a developer/security engineer signs off, promoting the proposal to a
   production `.logicn`.

**Intent-drift guard:** because `intent` is required for secure governed flows, validate that an
`intent` block is strictly **descriptive declarative prose** — zero logic primitives, URLs, or
variable references (prevents prompt-injection from smuggling behavior into the intent string).

## The corrected contract lifecycle — which clauses, when

Nothing here is *globally* mandatory. Requirement depends on the **flow kind** and **policy**.

| Clause | Status | Role | Notes for AI / runtime / governance |
|---|---|---|---|
| `types` | **Optional** | flow-local type aliases/records | omit for primitive/pure flows or when using global types |
| `intent` | **Recommended; required for secure governed flows** | human-readable purpose | **required for AI-generated flows** — grounds the model + gives reviewers an audit path |
| `request` | **Required for API/route flows only** | accepted input shape | **omit for internal/pure functions** |
| `response` | **Required for API/route flows only** | output policy | **omit for internal/pure functions** |
| `effects` | **Required iff side effects exist** | allowed side effects | **deny-by-default: omitted ⇒ strictly pure.** AI may propose additions; human approves |
| `authority` | Optional / required by policy | actor/capability requirements | must match or *restrict* ambient runtime settings, never widen silently |
| `privacy` | Optional / required when sensitive data exists | PII/PHI/redaction rules | masking before data leaves the trust boundary |
| `secrets` | **Optional, auto-by-default** | sealed credential handles/providers | omitted ⇒ runtime handles config via standard env (`.env`) automatically; ephemeral, never logged |
| `audit` | Optional / required by policy | audit obligations | omit for a standard web API; mandatory + detailed for healthcare/banking |
| `limits` | Optional / policy default | runtime safety bounds (CPU/mem/time) | overrides or inherits global defaults |
| `economics` | **Optional, auto-by-default** | cost/resource budget | auto-inferred from CostGraph/ValueGraph when omitted |
| `epilogue` | **Optional, auto-by-default** | post-exec proof strategy | auto-tier from value when omitted; declare to pin a strategy |
| `targets` | Optional | execution preference/fallback | hardware/TEE/WASM isolation hints; never grants authority |

## Decision guide by flow kind

- **Pure / internal flow** (a math transform, a helper, an internal pipeline step):
  `intent` (if secure/governed) + `types` (if it needs local types). **No `request`/`response`,
  no `effects`** (it's pure). Don't carry API routing baggage.
- **API / route flow** (external ingress/egress): add `request` + `response`. Add `effects`
  for any side effects, `limits`, and `audit`/`privacy` per policy.
- **High-trust mutation** (medical ledger, billing, gov record): the full set —
  `authority` + `effects` (explicit) + `privacy` + `secrets` + mandatory `audit` + `limits` +
  `economics`.

## Verified-minimal templates (these compile — Stage-A ACCEPT)

Pure/internal flow — minimal governed contract, no API baggage, no effects:
```logicn
pure flow classify(score: Int) -> Verdict
contract {
  types { type Verdict = Result<String, String> }
  intent { "Classify a score, returning Ok(label) or Err(reason)." }
}
{
  if score < 0 { return Err("negative") }
  if score >= 50 { return Ok("pass") }
  return Ok("fail")
}
```

Secure flow with an effect (deny-by-default ⇒ `effects` only because it writes audit):
```logicn
secure flow recordAmount(amount: Int) -> Result<Int, String>
contract {
  intent { "Record an amount to the audit log." }
  effects { audit.write }
}
{
  AuditLog.write("amount recorded")
  return Ok(amount)
}
```
(More verified flows: `tests/r6-corpus/r6-00N-*.lln`.)

## Reference blueprints (authoritative STRUCTURE; some syntax illustrative/forward)

> These show the *shape* of correct contracts. A few constructs are forward/aspirational and may
> not compile in today's Stage-A (e.g. inline `type X { ... }` records that don't yet unify
> nominally, `mutates state.x`, `network allow "..."`, `bind "KEY" from provider.vault`,
> `max_gas 500_units`). Treat the structure as canonical; use the verified-minimal templates above
> for guaranteed-compiling code.

### A. Hardened API route — safe input parsing
```logicn
secure flow parseInput(readonly request: Request) -> ParseInputResult {
  contract {
    types {
      type RawInput { data: String }
      type ParsedOutput { tokens: Array<String> }
      type ParseInputResult = Result<ParsedOutput, ApiError>
    }
    intent   { "Parse untrusted input into a token list." }
    request  { accepts json  requires body }      // required: this is an API/route flow
    response { returns json }                      // required: API/route flow
    limits   { memory 16mb  request_time 1s }
    // audit omitted: standard web API, no specialized logging needed
  }
  unsafe let rawBody: String = request.body
  unsafe let decoded = json.decode<RawInput>(rawBody)
  match decoded {
    Ok(inputUnsafe) => {
      let inputSafe: RawInput = validate.rawInput(inputUnsafe)
      return Ok(ParsedOutput { tokens: String.split(inputSafe.data, " ") })
    }
    Err(error) => { return Err(ApiError.BadRequest) }
  }
}
```

### B. Governed high-trust mutation — medical ledger
```logicn
secure flow recordMedicalTransaction(readonly inputPayload: MedicalPayload) -> TransactionResult {
  contract {
    types {
      type MedicalPayload { patient_id: String  treatment_code: String  billing_amount: Int64 }
      type TransactionResult = Result<String, GovernanceError>
    }
    intent { "Record an encrypted billing event to the ledger and verify actor authorization." }
    // internal pipeline invocation: request/response omitted (not an external route)
    authority { requires capability.billing.mutate  signed_by actor.system.billing_agent }
    effects   { mutates state.billing.ledger  network allow "vault.internal.net:8200" }
    privacy   { mask patient_id  strategy transform.crypto_pseudonymize }
    secrets   { bind "LEDGER_WRITE_KEY" from provider.vault }
    audit     { level cryptographic_state_hash  target storage.tpm_backed_log  track [ effects.mutates ] }
    limits    { memory 64mb  request_time 500ms }
    economics { max_gas 500_units  allocation profile.billing_operations }
  }
  // compiler enforces: only state.billing.ledger may mutate; only vault.internal.net reachable.
}
```

## Quick checklist for AI generation

- [ ] `intent` present (descriptive prose only) for any secure/governed flow.
- [ ] `request`/`response` **only** if it's an API/route flow — never on pure/internal flows.
- [ ] `effects` lists **exactly** the side effects the body performs (deny-by-default; none ⇒ omit).
- [ ] Never widen `authority`/`effects`/`secrets` automatically — emit a `*.logicn.proposal` instead.
- [ ] `types` only when the flow needs local aliases/records.
- [ ] High-trust data ⇒ add `privacy` + `audit` (+ `secrets` for credentials).
- [ ] Leave `economics`/`secrets`/`epilogue` out unless overriding the auto behavior.
