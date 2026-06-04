# LogicN Architecture Blueprint

## Module 2 of 7: The `invariant` Contract Block

---

### 1. Metadata and Classification

* **Layer:** Code Syntax / Local Constraint Verification Layer
* **System Responsibility:** Defines local execution contracts, pre-conditions, post-conditions, and loop terminal bounds at the scope of individual application flows. It serves as the local verification surface for the `ProofGraph` compiler pass.
* **Target Components:** `logicn-core-compiler` (specifically `parser.lln` and `type-checker.lln`), `logicn-core-runtime` (fast-path execution boundary wrapping).

---

### 2. What It Is

An `invariant` is a localized contract block declared strictly **outside** a flow’s execution body. It establishes the mathematical truth criteria that the runtime system must uphold immediately before a flow begins (`pre-condition`) and immediately after it finishes execution (`post-condition`), as well as terminal safety bounds (`loop decreases` tracking).

Unlike traditional codebases where safety boundaries are handled via inline procedural code (such as `if/else` checks, throws, or logging loops), an `invariant` block forces developers to express program limits as abstract, non-procedural property declarations.

---

### 3. What It Does

* **Statically Proves Logical Truth Bounds:** Instructs the compiler's `ProofGraph` tool to statically calculate value boundaries (e.g., verifying that integer values can never cross numeric minimum or maximum thresholds).
* **Guarantees State Consistency:** Ensures critical application state metrics (e.g., `ledger.totalCredits == ledger.totalDebits`) are checked and validated before any state alterations are permanently written to an external persistence target.
* **Injects Lightweight Runtime Guardrails:** If a condition cannot be fully proven at compile-time (e.g., input data dependent on a dynamic external API response), the compiler injects a highly optimized WebAssembly execution gate at the exact entrance and exit boundaries of the flow.
* **Enforces Execution Totality:** Uses termination expressions (such as `decreases`) to prove that loops or recursive sequences cannot execute infinitely, preventing thread-locking behavior.

---

### 4. What It Does NOT Do

* **It does NOT manage environmental permissions:** It cannot control network routes, file system access privileges, or hardware configurations. Those capabilities belong strictly to the system-level `policy` block.
* **It does NOT handle fallback logic or error recovery values:** An invariant does not contain procedural code to handle failures. It is a strict assertion engine. If an invariant is violated, execution stops instantly; it does not return default values or attempt retries.
* **It does NOT manipulate application data:** An invariant cannot change the state of a variable or write to a ledger. It is strictly a read-only validation check.

---

### 5. Core Concept and Mathematical Grounding

The `invariant` block utilizes Hoare Logic properties ($\{P\}\ c\ \{Q\}$) to model flow computations as verified mathematical proofs.

For any given flow body execution $c$, the invariant block declares:

1. **A Pre-condition ($P$):** The system state criteria that must evaluate to `true` before execution enters $c$.
2. **A Post-condition ($Q$):** The system state criteria that must evaluate to `true` after execution exits $c$, assuming $P$ was initially true and $c$ terminated safely.

$$\forall s, s' \in \text{State}, \quad P(s) \land \langle c, s \rangle \to s' \implies Q(s')$$

If the compiler's static analysis tool (`governance-verifier.lln`) can mathematically prove that $Q$ is guaranteed for all execution states satisfying $P$, the runtime execution cost drops to **zero machine cycles**. If the condition cannot be statically proven, a runtime assertion gate is automatically generated.

---

### 6. Architectural Flowchart

```
                 +-----------------------------------+
                 |        Flow Invocation            |
                 |  executeFlow(name, args, body)    |
                 +-----------------------------------+
                                   |
                                   v
                 +-----------------------------------+
                 |    ① Pre-Invariant Check Gate     |
                 |  Statically proven? -> Skip       |
                 |  Dynamic? -> Run Bitwise Assert   |
                 +-----------------------------------+
                                   |
                     [Passes Pre-Condition?]
                                   |
                    +--------------+--------------+
                    |                             |
                 (Yes)                          (No)
                    |                             |
                    v                             v
     +------------------------------+     +-------------------------------+
     |      Execute Flow Body       |     |      Halt Thread Instantly    |
     |   Inside Isolated Sandbox    |     |  Emit Code: LLN-INV-001       |
     +------------------------------+     +-------------------------------+
                    |
                    v
     +------------------------------+
     |   ② Post-Invariant Check Gate|
     |  Statically proven? -> Skip       |
     |  Dynamic? -> Run Bitwise Assert   |
     +------------------------------+
                    |
                    +--------------+
                    |              |
                 (Pass)         (Fail)
                    |              |
                    v              v
     +----------------------+     +-------------------------------+
     |  Commit Result state |     |    Rollback Isolate Memory    |
     | Emit EpilogueReceipt |     |    Emit Code: LLN-INV-002     |
     +----------------------+     +-------------------------------+

```

---

### 7. How to Add `invariant` Blocks to LogicN: Implementation Blueprint

To integrate `invariant` block handling into your self-hosted Stage B compiler and runtime execution layers, follow this development sequence:

#### Step 1: Update the EBNF Grammar and Parser (`parser.lln`)

Extend your language syntax compiler to parse the `invariant` keyword block inside flow definitions.

Add this parsing branch to `logicn-core-compiler/src/parser.lln`:

```rust
;; Location: logicn-core-compiler/src/parser.lln

type InvariantExpr = 
  | EnsureEquals(left: String, right: String)
  | EnsureLessThanOrEqual(left: String, right: U32)

flow parseInvariantBlock(tokens: TokenStream) -> Result<List<InvariantExpr>, ParseError> {
  match tokens.next() {
    Some(Token::Keyword("invariant")) => {
      expectToken(tokens, Token::LeftBrace);
      let expressions = List.new();
      
      while (tokens.peek() != Token::RightBrace) {
        expectToken(tokens, Token::Keyword("ensure"));
        let expr = parseExpression(tokens);
        expressions.append(expr);
      }
      
      expectToken(tokens, Token::RightBrace);
      return Ok(expressions);
    }
    _ => return Ok(List.empty())
  }
}

```

#### Step 2: Inject Invariant Constraints into the Compiler ProofGraph (`governance-verifier.lln`)

When building the execution flow-plan, the governance verifier must collect invariant rules and verify if they are satisfied statically by the value assignments.

```rust
;; Location: logicn-core-compiler/src/governance-verifier.lln

flow verifyFlowInvariants(flowAst: FlowAST, proofGraph: ProofGraph) -> List<Diagnostic> {
  let diagnostics = List.new();
  
  for condition in flowAst.contract.invariants {
    ;; Query the Static Value-State Tracker to see if the boundary is met
    let isStaticallyProven = proofGraph.checkSatisfiability(condition);
    
    if (!isStaticallyProven) {
      ;; The boundary is valid but depends on dynamic runtime inputs.
      ;; Mark it as an 'Active Runtime Instruction Requirement' in the manifest.
      proofGraph.registerDynamicGate(flowAst.id, condition);
      
      log::warn("LLN-TERM-001: Condition cannot be proven statically. Injecting runtime check.");
    }
  }
  
  return diagnostics;
}

```

#### Step 3: Emit Runtime WebAssembly Assertion Gates (`wat-emitter.lln`)

If an invariant requires a dynamic check, the compiler must inject an assertion wrapper inside the generated WAT output file.

```rust
;; Location: logicn-core-compiler/src/wat-emitter.lln

flow emitWATInvariantGate(condition: InvariantExpr) -> String {
  match condition {
    InvariantExpr.EnsureLessThanOrEqual(varName, limit) => {
      return String.concat([
        "global.get $", varName, "\n",
        "i32.const ", Int.toStr(limit), "\n",
        "i32.le_u\n",
        "if\n",
        "  ;; Condition met, pass execution gate\n",
        "else\n",
        "  i32.const 1001\n", ;; Diagnostic Code: LLN-INV-001 (PreConditionViolation)
        "  call $abort_execution_trap\n",
        "end\n"
      ]);
    }
    _ => return ";; Unsupported invariant gate pattern"
  }
}

```

---

### 8. Verification and Operational Metrics

To verify that the `invariant` block functions as an active constraint system, evaluate your integration against these test patterns:

1. **Static Verification Bypass:** Write a flow with an invariant asserting `ensure x <= 100`. Statically assign `let x = 50`. Compile the program and inspect the generated WAT code. Verify that **zero** condition checking statements or comparison loops were emitted for `x`.
2. **Runtime Exception Interception:** Write a flow that accepts a dynamic runtime parameter `input_val`. Add the invariant `ensure input_val <= 50`. Pass an input parameter of `65` during run execution. The execution layer must trip instantly before entering the main flow body, aborting with exit code `LLN-INV-001`.

---

*This concludes Module 2 of 7. Please request **Module 3: emergency** when you are ready to proceed.*