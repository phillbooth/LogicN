# LogicN — Semantic Graph System (LLN-Graph Evolution)

**Status:** Phase 13 — Architectural Proposal
**Priority:** HIGH — differentiates LogicN from all other language projects
**Depends on:** LLN-Graph (`C:\laragon\www\LLN-Graph`), `logicn-devtools-graph-algorithms`
**Decision:** SemanticGraph is the resolved queryable layer built from AST — does NOT replace AST

---

## TL;DR

- LLN-Graph evolves from a graph utility library into the canonical semantic foundation of the entire LogicN ecosystem
- SemanticGraph = resolved, queryable program meaning built from AST — compiler, IDE, AI, governance, self-hosting all operate on the same model
- The AST remains compiler truth; SemanticGraph is the resolved, enriched layer above it

---

## Current Architecture Problem

### Current State (LLN-Graph is downstream)

```
Source
  → Lexer
  → Parser
  → AST
  → Type Checker
  → Effect Checker
  → Compiler
    → Reports
      → LLN-Graph   ← downstream consumer, receives data after all decisions are made
```

LLN-Graph currently sits at the end of the pipeline. It receives data only after the compiler has finished all reasoning. It cannot influence, query, or participate in the resolution process. The compiler, IDE, AI tooling, and governance engine each build their own partial models independently — there is no single shared semantic model.

### Proposed State (LLN-Graph is the centre)

```
Source
  → Lexer
  → Parser
  → AST
  → Semantic Resolver
    → LLN-Graph   ← canonical shared semantic model
      → Type Checker
      → Effect Checker
      → Governance
      → Runtime
```

LLN-Graph becomes the resolved semantic model that all downstream consumers query. The AST drives the resolver; the SemanticGraph is the enriched output. Every compiler pass, IDE query, AI context export, and governance check operates on the same graph. One model, one truth.

---

## SemanticGraph — New Graph Type

`SemanticGraph` is a new graph family within LLN-Graph. It is not a general-purpose graph — it is specifically shaped to represent resolved LogicN program meaning.

### Node Types

| Node | Represents |
|---|---|
| `Flow` | A named flow declaration |
| `Function` | An `fn` function |
| `Type` | A type declaration |
| `Enum` | An enum declaration |
| `Variable` | A let binding or parameter |
| `Effect` | A declared effect (e.g. `database.read`) |
| `Capability` | A capability requirement |
| `Intent` | An intent declaration |
| `Boundary` | A trust boundary |
| `Module` | A module or package |
| `Import` | An import declaration |
| `Export` | An export declaration |

### Edge Types

| Edge | Meaning |
|---|---|
| `calls` | Flow/function calls another |
| `returns` | Flow/function returns a type |
| `uses` | Node uses another node |
| `declares` | Module/scope declares a symbol |
| `requires` | Flow requires a capability or effect |
| `owns` | Boundary owns a node |
| `imports` | Module imports another |
| `exports` | Module exports a node |
| `dependsOn` | Structural dependency |
| `crossesBoundary` | Data or call crosses a trust boundary |

### Example

```
getUser
  → requires   → database.read
  → returns    → User
  → calls      → dbQuery
  → belongsTo  → users.lln
```

This graph fragment encodes everything the compiler, AI assistant, IDE, and governance engine need to reason about `getUser` — without reading source files.

---

## Compiler Output: --emit-semantic-graph

```
logicn check --emit-semantic-graph
```

Emits: `build/semantic/semantic-graph.json`

The emitted graph contains the resolved semantic model for the entire program. Fields include:

- `flows` — all resolved flow nodes with edges
- `effects` — declared and inferred effects per flow
- `capabilities` — capability requirements per flow
- `returnTypes` — resolved return types
- `boundaries` — trust boundary membership
- `diagnostics` — any graph-level diagnostics

This file is machine-readable and designed for tooling consumption — CI, governance verifiers, static analysis, IDE language servers.

---

## AI-Oriented Output: --emit-ai-graph

```
logicn check --emit-ai-graph
```

Emits: `build/semantic/logicn.ai.json`

Rather than requiring an AI assistant to read dozens of source files and infer meaning, `--emit-ai-graph` provides a fully resolved, enriched graph purpose-built for AI reasoning.

Fields include:

- `resolvedTypes` — every type, fully resolved (no aliases unresolved)
- `effects` — effect sets per flow, with propagation chain
- `capabilities` — capability requirements and their sources
- `governanceMetadata` — boundary rules, trust levels, policy tags
- `sourceSpans` — file + line references for each node (AI can anchor back to source)
- `diagnostics` — all current compiler diagnostics with node references

**Why this matters:** Instead of an AI reading 100 files and guessing at types, effects, and intent — it receives a pre-resolved graph that the compiler itself has verified. The AI reasons on compiler truth, not on raw syntax. This is the correct separation of responsibilities.

---

## New Graph Families

### 1. SemanticGraph — Compiler Semantic Model

The primary graph. Built by the Semantic Resolver from the AST. All compiler passes downstream of the resolver query this graph. This is the graph described in detail above.

### 2. TypeGraph — Type System Graph

Nodes: `Type`, `Generic`, `Constraint`, `Alias`, `Enum`

Models the full type system as a graph — generics and their constraints, type aliases and what they alias, enum variants, and subtype relationships. Enables the type checker to query relationships rather than walking raw AST structures.

Supports: `LLN-TYPE-*` diagnostic codes.

### 3. IntentGraph — Intent and Governance Graph

Nodes: `Intent`, `Flow`, `Capability`, `GovernanceRule`

Models declared intent and the governance rules that govern it. Links intents to the flows that implement them, and flows to the capabilities they require. Enables governance queries as graph traversals.

Supports: `LLN-INTENT-*` diagnostic codes.

### 4. CompilerGraph — Self-Hosting Compiler Graph

Used by the Stage B self-hosting compiler. Tracks the compiler's own structure as a graph — `Parser`, `TypeChecker`, `EffectChecker`, `CodeGen` nodes and their relationships.

The self-hosting compiler reasons about its own passes using the same graph model it uses for user applications. One reasoning model for everything.

---

## Self-Hosting Benefits

The Stage B compiler is itself a LogicN program. When it self-hosts, it processes its own source through the same Semantic Resolver and builds a `SemanticGraph` of its own structure.

This means:

- The compiler reasons about its own type checker using the same graph queries it uses for user code
- Compiler bootstrapping uses the same model as application compilation
- There is no special internal representation — the self-hosting compiler is just another program in the graph

One reasoning model. No special cases.

---

## IDE Benefits

The IDE language server queries the `SemanticGraph` directly rather than re-parsing source or maintaining a separate internal model. This enables:

- **Callers of a flow** — graph traversal for incoming `calls` edges
- **Capability chain** — walk `requires` edges from a flow to its full capability set
- **Effect propagation** — follow `uses` and `calls` edges to compute transitive effects
- **Trust boundary inspection** — query `crossesBoundary` edges to show what data crosses what boundary
- **Dependency path** — shortest path between two nodes (e.g. how does module A reach module B)

All of these are graph queries. None require re-parsing or type-checking source files at query time.

---

## Governance Benefits

Every governance question becomes a graph traversal over the `SemanticGraph` or `IntentGraph`. Examples:

- "Can `database.read` reach `network.send`?" — traverse `calls` and `uses` edges, check for a path
- "Can a value tagged `protected Email` cross a `public` boundary?" — check `crossesBoundary` edges for trust level mismatches
- "Which flows require capability `filesystem.write` without declaring it?" — query `requires` edges against declared capability sets
- "Does intent `user-data-handling` cover all flows that touch `User` type?" — `IntentGraph` traversal

No custom governance logic is needed for each question. The graph structure encodes the relationships; the governance engine traverses them.

---

## Implementation Order

### Phase 1 — SemanticGraph + --emit-semantic-graph

- Define `SemanticGraph` node and edge types in LLN-Graph
- Build `SemanticResolver` compiler pass that constructs the graph from AST
- Wire graph into Type Checker and Effect Checker as a query source
- Implement `--emit-semantic-graph` CLI flag
- Emit `build/semantic/semantic-graph.json`

### Phase 2 — AI Graph Export (logicn.ai.json)

- Define `logicn.ai.json` schema (extends semantic graph with enriched metadata)
- Implement `--emit-ai-graph` CLI flag
- Include resolved types, effects, capabilities, governance metadata, source spans, diagnostics
- Validate output is useful for AI assistant context injection

### Phase 3 — TypeGraph + IntentGraph

- Define `TypeGraph` node and edge types
- Build TypeGraph from resolved type declarations
- Wire into Type Checker; support `LLN-TYPE-*` diagnostics via graph queries
- Define `IntentGraph` node and edge types
- Build IntentGraph from intent declarations and flow mappings
- Wire into governance verifier; support `LLN-INTENT-*` diagnostics via graph queries

### Phase 4 — CompilerGraph + Self-Hosting Integration

- Define `CompilerGraph` node and edge types (compiler pass nodes)
- Build CompilerGraph for Stage B self-hosting compiler
- Verify Stage B can reason about its own structure using the same graph model as user applications
- Complete: one reasoning model, all contexts

---

## Architecture Decision

> The AST remains compiler truth. SemanticGraph is the resolved, queryable layer built from the AST. That is the architecture that scales best.

The AST is the direct product of parsing. It is the authoritative record of source structure and is never discarded. The `SemanticGraph` is built from the AST by the Semantic Resolver — it adds resolved types, inferred effects, capability bindings, boundary memberships, and intent links. It is the enriched, queryable model that everything above the resolver layer consumes.

Replacing the AST with the graph would lose precision. Bypassing the graph and querying the AST directly in downstream tools would duplicate resolution logic across every consumer. The two-layer model — AST as truth, SemanticGraph as resolved layer — is the architecture that keeps the compiler authoritative while making reasoning accessible.

---

## Rules at a Glance

| Rule | Detail |
|---|---|
| SemanticGraph does not replace AST | AST is compiler truth; graph is resolved layer above it |
| All consumers query the graph | Compiler passes, IDE, AI, governance — same model |
| Graph is built once per compilation | Semantic Resolver runs after parsing, before type checking |
| AI output is pre-resolved | `logicn.ai.json` contains no ambiguity — types and effects are already resolved |
| Self-hosting uses the same model | Stage B compiler is just another LogicN program in the graph |
| Governance is traversal | Every governance question is a graph query, not custom logic |

---

## See Also

- [lln-graph](C:\laragon\www\LLN-Graph) — the graph library that SemanticGraph is built on
- [logicn-roadmap](logicn-roadmap.md) — overall phase roadmap
- [logicn-gir-schema](logicn-gir-schema.md) — GIR (Governed IR) schema, related IR layer
- [capability-registry.yaml](capability-registry.yaml) — authoritative capability definitions
