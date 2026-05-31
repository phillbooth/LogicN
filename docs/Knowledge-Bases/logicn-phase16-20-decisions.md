# LogicN Phase 16–20 Design Decisions

## Status

```
Recorded: 2026-05-31
Applies to: Phase 16-20 + Stage B/C definitions
```

---

## Decision 1 — Stage B Complete Definition

```text
Stage B Complete = Medium
```

**One-line definition:**
"Stage B is complete when the LogicN-native compiler can lex, parse, build an AST, resolve imports, and perform semantic/type analysis on real LogicN programs without relying on TypeScript compiler logic."

**Required for Stage B Complete:**
```
lexer.lln            ← Stage B1 (partially done)
parser.lln           ← Stage B1 (v0 done)
ast.lln              ← Stage B2
importResolver.lln   ← Stage B2
typeChecker.lln      ← Stage B2
effectChecker.lln    ← Stage B2
```

**NOT required for Stage B Complete:**
- Full code generation
- Deterministic bootstrap
- TypeScript removal

Those are Stage C concerns.

**Stage B sub-milestones:**
```
Stage B1 — Parsing
  lexer.lln + parser.lln can parse real LogicN

Stage B2 — Semantic Analysis
  typeChecker.lln + effectChecker.lln can validate real LogicN

Stage B3 — Self-Hosted Front End
  Source → LogicN Compiler → Diagnostics (no TypeScript compiler logic)

Stage B Complete
```

**Stage C — Bootstrap Independence:**
```
LogicN Compiler compiles LogicN Compiler
Deterministic self-host verification (B1 == B2 == B3)
Root capability provider enforced
TypeScript compiler dependency removed
```

---

## Decision 2 — Package System: Both registry and manifests

```
Built-in @logicn/* packages → internal registry (hardcoded, fast)
User/workspace packages     → package.logicn.yaml manifests
```

**Resolution order:**
1. Built-in registry (for `@logicn/*` certified packages)
2. Workspace `package.logicn.yaml`
3. Local package path
4. Later: certified remote registry

**Minimal manifest shape:**
```yaml
name: "@myorg/customer-types"
version: "0.1.0"
exports:
  types:
    - CustomerId
    - Customer
    - Email
effects: []
capabilities: []
```

**Rule:** Do NOT expand the hardcoded registry as the general package system.
The registry is for known certified LogicN packages. Everything else uses manifests.

---

## Decision 3 — executePlan() scope: all flows eventually

**End state:** All flows use `executePlan()`. No two runtimes.

**Phase 16 scope (start with):**
- Secure flows → GovernedPlan
- Guarded flows → GovernedPlan
- Simple pure flows → PurePlan

**Plan types:**
```
PurePlan:
  constants, local lets, arithmetic, pure fn calls, return

GovernedPlan:
  effects, capabilities, audit events, denied behaviours, runtime checks
```

Both executed by the same `executePlan()` engine.

**Why not secure/guarded only?**
Two runtimes (AST-walked + plan-based) become permanent technical debt.
One engine, two plan complexities — is the correct architecture.

**One-line rule:**
"Phase 16 replaces AST-walking for all flow kinds, beginning with a minimal PurePlan and expanding toward full governed execution plans."

---

## Decision 4 — Roadmap granularity: Phase numbers + milestone names

```
Phase 16 — Passive Execution Plans
Phase 17 — Package System & Import Resolution
Phase 18 — AI Semantic Graph
Phase 19 — Compiler Governance
Phase 20 — Stage B Completion
```

Benefits:
- Phase numbers: progress tracking, issue grouping, release planning
- Milestone names: readability, meaning, developer memory

Rule: developers remember "Semantic Graph milestone", not "Phase 18". Use both.

---

## Summary

```
Stage B Complete    = Medium (lexer + parser + type checker + effect checker self-hosted)
Package System      = Both (registry for @logicn/*, manifests for user packages)
executePlan() scope = All flows (PurePlan for pure, GovernedPlan for governed)
Roadmap format      = Phase numbers + milestone names
```

## See Also

- `logicn-roadmap.md` — Phase 1–15 completed
- `logicn-phase-11-decisions.md` — Phase 11 decisions
- `logicn-phase-13-decisions.md` — Phase 13/14 decisions
- `logicn-deterministic-selfhost-verification.md` — Stage C verification spec
