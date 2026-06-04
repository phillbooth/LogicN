## Summary

<!-- What does this PR do? 1-3 bullet points. -->

-
-

## Change class

<!-- The CI governance diff will auto-classify your PR. If you know in advance: -->

- [ ] **Neutral** — documentation, refactors, no governance delta
- [ ] **Tightening** — fewer effects, stricter privacy, smaller limits
- [ ] **Expansion** — new effects, new secrets, broader authority, larger budgets → _requires 2 reviewers including security/governance owner_
- [ ] **Experimental** — `policy { emergency {} }`, `@experimental_profile`, native backend → _requires architecture review_

## Test plan

<!-- What was tested? -->

- [ ] `node scripts/run-phase-close.mjs` — all gates green
- [ ] `node logicn.mjs check <changed files>` — 0 errors
- [ ] Relevant test files updated

## Governance checklist

<!-- For Expansion or Experimental changes — complete these: -->

- [ ] `intent {}` block correctly describes the new behaviour (not just the mechanism)
- [ ] New `effects {}` entries are necessary and minimal
- [ ] No `secrets {}` bindings added without vault/rotation policy
- [ ] `LLN-GOV-004` (domain guard) respected if `[conforms_to: X]` applies
- [ ] Security/governance owner notified (Expansion) or architecture review scheduled (Experimental)

## References

<!-- Link to relevant KB docs, notes, or task numbers -->

- Task: #
- KB: `docs/Knowledge-Bases/`
