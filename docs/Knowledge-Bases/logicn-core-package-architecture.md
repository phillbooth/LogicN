# LogicN Core Package Architecture

**Status:** Reference diagram  
**Scope:** `logicn-core*` package family — logical dependency graph and runtime data flow  
**Note:** Workspace package links (`@logicn/*` imports across packages) are pending; packages are currently standalone with types duplicated locally. These diagrams show the intended logical relationships.

---

## 1. Package Dependency Graph

The `logicn-core*` packages form a layered dependency graph: foundation types at the base, security and config above them, execution and I/O governance above those, and the CLI as the top-level orchestrator.

```mermaid
graph TB
    subgraph Foundation["Foundation Layer"]
        core["@logicn/core\nAST node kinds · AstNodeKind\nCompilerDiagnostic · SafetyLevel\nCONTENT_BLOCK_TYPES\ncreateDiagnostic · hasErrors · filterBySeverity"]
        logic["@logicn/core-logic\nTriState (v0.2 discriminated union)\nDecision (4-state: allow/deny/review/unknown)\nBoolBoundary · OmniState (8-value)\nsub-paths: /tri /decision /bool-boundary /omni"]
    end

    subgraph SecurityLayer["Security Layer"]
        security["@logicn/core-security\nSecureStringReference · redactText\nPermissionModel · decidePermission\nCryptographicPolicy · SecurityReport\nLLN-SECURITY-001…"]
    end

    subgraph ConfigLayer["Config & Environment Layer"]
        config["@logicn/core-config\nProjectConfig · EnvironmentConfig\nRuntimeConfigHandoff · loadConfigFromObjects\nVault (LLN-VAULT-001–005)\ndefaultEnvironmentPolicy · LOGICN_ENVIRONMENT_MODES"]
    end

    subgraph IOLayer["I/O Governance Layer"]
        network["@logicn/core-network\nNetworkPolicy · defineNetworkPolicy\nNetworkReport · selectNetworkBackend\nDEFAULT_TLS_POLICY\nWebhookVerificationConfig (specified)"]
        reports["@logicn/core-reports\nAll LoReport kinds (14 canonical)\ncreateBuildReport · createSecurityReport\ncreateProcessingReport · createFlowTraceReport\nserializeReportJson · validateLoReport"]
    end

    subgraph ExecutionLayer["Execution Layer"]
        runtime["@logicn/core-runtime\nRuntimeContext · createRuntimeContext\nRuntimeEffectPolicy · decideRuntimeEffect\nDEFAULT_RUNTIME_EFFECT_POLICY\ncreateRuntimeReport"]
        compute["@logicn/core-compute\nRuntimeTarget (11 values)\nGpuPlan · OpticalPlan · WasmTarget\nCompatibilityReport\n(stubs — Phase 3)"]
        tasks["@logicn/core-tasks\nAsync task / worker model\nStructured Await contracts\n(stubs — Phase 3)"]
    end

    subgraph CompilerLayer["Compiler Layer"]
        compiler["@logicn/core-compiler\nvalidateCoreSyntaxSafety\ncheckBindingReassignment · checkReadonlyMutation\nvalidateIntentEffects (stub)\nLLN-SYNTAX/BINDING/PIPELINE/INTENT/BLOCK/STRING/CHAR/BYTE-*"]
    end

    subgraph CLILayer["CLI Layer"]
        cli["@logicn/core-cli\nlogicn check · logicn fmt · logicn build\nlogicn verify · logicn deploy\nlogicn explain · logicn plan"]
    end

    core --> compiler
    core --> security
    core --> logic
    logic --> compiler
    logic --> runtime
    security --> config
    security --> network
    security --> runtime
    config --> runtime
    config --> compiler
    network --> runtime
    reports --> runtime
    reports --> compiler
    reports --> cli
    runtime --> compute
    runtime --> tasks
    compute --> cli
    tasks --> cli
    compiler --> cli
```

---

## 2. Runtime Data Flow

The current execution model is Node-hosted. LogicN governs execution through declared effects, capability checks, and policy enforcement — it does not bypass the host.

```mermaid
flowchart TD
    HTTP["HTTP Request\n(external — untrusted)"]
    Node["Node.js Server\n(host transport)"]
    APIServer["logicn-framework-api-server\n(route dispatch, boundary check)"]
    Config["@logicn/core-config\nRuntime Policy Config\nVault · EnvironmentConfig"]
    Security["@logicn/core-security\nPermission check\nSecret redaction"]
    Compiler["@logicn/core-compiler\nSyntax safety · Intent check\n14-pass pipeline → Governed IR"]
    Runtime["@logicn/core-runtime\nEffect gating · RuntimeContext\nCapability locking"]
    Logic["@logicn/core-logic\nTriState · Decision · BoolBoundary\nOmni conversion"]
    Network["@logicn/core-network\nOutbound policy check\nTLS/SSRF enforcement"]
    Reports["@logicn/core-reports\nAudit events · FlowTrace\nSecurityReport · RuntimeReport"]
    Response["HTTP Response\n(safe, typed, redacted)"]

    HTTP --> Node
    Node --> APIServer
    APIServer --> Config
    Config --> Security
    Security --> Runtime
    Runtime --> Compiler
    Compiler --> Logic
    Runtime --> Network
    Runtime --> Reports
    Logic --> Runtime
    Network --> Reports
    Runtime --> Response
    Reports --> Response
```

---

## 3. Compile-Time Pipeline Flow

Source `.lln` files pass through the prototype parser (Stage 1, in `@logicn/core/compiler/`) and the compiler contract layer (`@logicn/core-compiler`). The 14-pass pipeline produces Governed IR and a RuntimeManifest.

```mermaid
flowchart LR
    Source[".lln source files"]
    Lexer["Pass 1–2: Lexer / Tokeniser\n(logicn-core/compiler/logicn.js)"]
    Parser["Pass 3: Parser\n→ AST (AstNodeKind)"]
    TypeCheck["Pass 4: Type checker\nBinding safety · LLN-SYNTAX/BINDING"]
    SafetyCheck["Pass 5–6: Safety checker\nSyntax safety · Content blocks\nvalidateCoreSyntaxSafety()"]
    IntentCheck["Pass 7–8: Intent / Effect checker\nvalidateIntentEffects() — stub\nLLN-INTENT-001–005"]
    PipelineCheck["Pass 9: Pipeline checker\ncheckMethodChain() — stub\nLLN-PIPELINE-001–005"]
    BoundaryCheck["Pass 10–11: Boundary / Effect checker\nLLN-BOUNDARY-* / LLN-EFFECT-*\n(specified — not yet implemented)"]
    ManifestGen["Pass 12–14: Optimise · Source map · Manifest\nRuntimeManifest + ManifestIntegrity\n(specified — not yet implemented)"]
    GovernedIR["Governed IR\n+ RuntimeManifest"]
    Diagnostics["Compiler diagnostics\n(LLN-* codes emitted per pass)"]

    Source --> Lexer --> Parser --> TypeCheck --> SafetyCheck
    SafetyCheck --> IntentCheck --> PipelineCheck --> BoundaryCheck --> ManifestGen
    ManifestGen --> GovernedIR
    TypeCheck --> Diagnostics
    SafetyCheck --> Diagnostics
    IntentCheck --> Diagnostics
    PipelineCheck --> Diagnostics
    BoundaryCheck --> Diagnostics
    ManifestGen --> Diagnostics
```

---

## 4. Diagnostic Code Namespaces

Each package owns a diagnostic namespace. The `LLN-*` format is `LLN-SERIES-NNN`.

| Prefix | Owner | Count | Status |
|---|---|---|---|
| `LLN-SYNTAX-*` | `@logicn/core-compiler` | 002 | Implemented |
| `LLN-BINDING-*` | `@logicn/core-compiler` | 004 | Implemented |
| `LLN-PIPELINE-*` | `@logicn/core-compiler` | 005 | Constants only (stubs) |
| `LLN-INTENT-*` | `@logicn/core-compiler` | 005 | Constants only (stubs) |
| `LLN-BLOCK-*` | `@logicn/core-compiler` | 004 | Implemented |
| `LLN-STRING-*` | `@logicn/core-compiler` | 004 | Constants only |
| `LLN-CHAR-*` | `@logicn/core-compiler` | 004 | Constants only |
| `LLN-BYTE-*` | `@logicn/core-compiler` | 005 | Constants only |
| `LLN-EFFECT-*` | `@logicn/core-compiler` | 004 | Specified — not implemented |
| `LLN-BOUNDARY-*` | `@logicn/core-compiler` | 004 | Specified — not implemented |
| `LLN-TRI-*` | `@logicn/core-logic` | 005 | Implemented |
| `LLN-DECISION-*` | `@logicn/core-logic` | 005 | Implemented |
| `LLN-BOOL-BOUNDARY-*` | `@logicn/core-logic` | 005 | Implemented |
| `LLN-OMNI-*` | `@logicn/core-logic` | 005 | Implemented |
| `LLN-CONFIG-*` | `@logicn/core-config` | 027 | Partially implemented |
| `LLN-VAULT-*` | `@logicn/core-config` | 005 | Implemented |
| `LLN-NETWORK-*` | `@logicn/core-network` | 008 | Specified — not implemented |
| `LLN-WASM-*` | `@logicn/core-compute` | 004 | Specified — not implemented |
| `LLN-COMPAT-*` | `@logicn/core-compute` | 004 | Specified — not implemented |
| `LLN-REPORT-*` | `@logicn/core-reports` | 005 | Specified — not implemented |
| `LLN-PROOF-*` | `@logicn/core-reports` | 005 | Specified — not implemented |
| `LLN-DENIAL-*` | `@logicn/core-reports` | 004 | Specified — not implemented |
| `LLN-EVIDENCE-*` | `@logicn/core-reports` | 004 | Specified — not implemented |
| `LogicN_RUNTIME_*` | `@logicn/core-runtime` | (open) | Implemented |
| `LogicN_SECURITY_*` | `@logicn/core-security` | (open) | Implemented |
| `LogicN_NETWORK_*` | `@logicn/core-network` | (open) | Implemented |
| `LogicN_REPORT_*` | `@logicn/core-reports` | (open) | Implemented |
| `LogicN_COMPILER_*` | `@logicn/core-compiler` | (open) | Implemented (scanner codes) |

---

## 5. Test Coverage Summary (2026-05-26)

| Package | Tests | Status |
|---|---|---|
| `@logicn/core` | 9 | All passing |
| `@logicn/core-compiler` | 20 | All passing |
| `@logicn/core-logic` | 51 | All passing |
| `@logicn/core-config` | 17 | All passing |
| `@logicn/core-security` | 14 | All passing |
| `@logicn/core-network` | 12 | All passing |
| `@logicn/core-reports` | 15 | All passing |
| `@logicn/core-runtime` | 12 | All passing |
| `@logicn/core-compute` | 5 | All passing |
| `@logicn/core-cli` | 6 | All passing |
| **Total** | **161** | **All passing** |
