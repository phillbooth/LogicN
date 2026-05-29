# LogicN Canonical Example Corpus (CEC)

## Purpose

The CEC teaches LogicN syntax and semantics to humans and AI in a structured,
progressive order. It is the primary learning resource for AI code generation
and developer onboarding.

Grammar → Examples → Compiler.

## Learning Order

AI learns trust boundaries before types. The corpus is ordered accordingly:

```
Level 1 — Basics        (001–020)   ← flow qualifiers, bindings, fn, match
Level 4 — Security      (151–175)   ← unsafe→protected→redacted→audit
Level 3 — Effects       (101–120)   ← pure/guarded/secure, effect rules
Level 2 — Types         (051–087)   ← domain types, Money, Tensor, Option, Result
Level 5 — Governance    (201–213)   ← intent, policy, proof, compute target
Level 6 — Compute       (planned)
Level 7 — AI            (planned)
Level 8 — Targets       (planned)
Level 9 — Enterprise    (planned)
```

## Example Format

Every example folder contains:

```
NNN-example-name/
  example.lln              ← LogicN source with /// header
  expected.diagnostics.txt ← "none" or LLN-CODE + message
  expected.gir.yaml        ← GIR output (only where specified)
  notes.md                 ← concept + AI rule explanation
```

### Header Format

```logicn
/// example: NNN-example-name
/// level: N
/// concept: description
/// expected_diagnostics: none | LLN-TYPE-001 | ...
/// ai_rule: One-sentence rule for AI code generators.
```

## Diagnostic Reference

| Code | Meaning |
|---|---|
| `LLN-TYPE-001` | Unknown type |
| `LLN-TYPE-002` | Type mismatch |
| `LLN-TYPE-004` | Invalid binary operation |
| `LLN-TYPE-009` | Generic arity mismatch |
| `LLN-EFFECT-XXX` | Effect not declared / effect violation |
| `LLN-SEC-014` | fn cannot declare effects or authority |
| `LLN-SEC-XXX` | Security rule violation |
| `LLN-GOV-XXX` | Governance rule violation |
| `LLN-MATCH-001` | Non-exhaustive match |
| `LLN-INTENT-001` | Intent/behavior mismatch |

## Canonical Pattern (most important example in the corpus)

```logicn
unsafe let rawEmail: String =
  req.body.email

let email: protected Email =
  validate.email(rawEmail)?

let auditEmail: redacted Email =
  redact(email)

AuditLog.write({
  email: auditEmail
})
```

```
Unsafe → Protected → Redacted → Audit
```

## Flow Qualifier Rules

| Qualifier | When to use |
|---|---|
| `pure flow` | No effects, deterministic computation only |
| `guarded flow` | Has declared effects |
| `secure flow` | External trust boundary (HTTP, API input) |
| `fn` | Local tidy helper inside a flow — no effects, no authority |
| `route` | Exposes a flow to external callers |

## See Also

- `docs/Knowledge-Bases/logicn-glossary.md` — canonical term definitions
- `docs/Knowledge-Bases/formal-type-system-spec.md` — type rules
- `docs/Knowledge-Bases/value-state-annotations.md` — unsafe/protected/redacted rules
- `docs/Knowledge-Bases/operator-type-rules.md` — operator compatibility
- `docs/Knowledge-Bases/stdlib-gates.yaml` — gate and sink registry
