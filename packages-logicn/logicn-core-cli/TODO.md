# LogicN CLI TODO

```text
[x] Create /packages-logicn/logicn-core-cli
[x] Add README.md
[x] Add TODO.md
[x] Add package.json
[x] Add tsconfig.json
[x] Add src/index.ts
[x] Add command router placeholder
[x] Add safe output redaction placeholder
[x] Add LogicN graph project graph command integration
[x] Add LogicN check command integration
[x] Add LogicN build command integration
[x] Add LogicN run command integration
[x] Add LogicN serve command integration
[x] Add LogicN reports command integration
[x] Add LogicN security:check command integration
[x] Add LogicN routes command integration
[x] Add LogicN task command integration with logicn-core-tasks
[ ] Complete LogicN build command — full 14-pass pipeline with artefact generation
[ ]   - emit runtime-manifest.json, compiler-report.json, effect-report.json, capability-report.json
[ ]   - emit audit-report.json, build-hash.txt
[ ]   - support --target, --json, --report, --strict, --profile, --out, --audit flags
[ ]   - implement BuildResult interface
[ ]   - implement buildWorkspace() async function
[ ]   - diagnostic codes LN-BUILD-001 through LN-BUILD-005
[ ]   - create build/ dir: build-command.ts, build-pipeline.ts, build-reporter.ts, build-artifacts.ts, build-integrity.ts
[ ] Complete LogicN verify command — full governance verification
[ ]   - validate manifest integrity (beyond hash-only)
[ ]   - validate runtime compatibility, capability consistency, audit reports
[ ]   - support --json, --strict, --manifest, --hash, --policy, --audit flags
[ ]   - implement VerificationResult interface (valid/manifestHash/graphHash)
[ ]   - implement verifyHash() function
[ ]   - diagnostic codes LN-VERIFY-001 through LN-VERIFY-005
[ ]   - create verify/ dir: verify-command.ts, verify-manifest.ts, verify-integrity.ts, verify-runtime.ts, verify-reporter.ts
[ ] Add LogicN deploy command integration
[ ]   - load workspace manifest, runtime profile, deployment policy
[ ]   - validate effects, capabilities, runtime targets, module hashes
[ ]   - produce deployment-report.json
[ ]   - support --dry-run, --json, --report, --audit, --strict flags
[ ]   - implement DeploymentResult interface (approved/profile/targets/effects)
[ ]   - implement validateEffects() function
[ ]   - return exit codes 0–7
[ ]   - diagnostic codes LN-DEPLOY-001 through LN-DEPLOY-005
[ ]   - create deploy/ dir: deploy-command.ts, deploy-policy.ts, deploy-validator.ts, deploy-report.ts, deploy-runtime.ts
[ ] Add LogicN explain command integration
[ ]   - explain imports, effects, capabilities, dependency tree
[ ]   - explain denial reasoning from deployment-denial.json
[ ]   - support --tree, --trace, --effects, --capabilities, --runtime, --policy, --audit, --json flags
[ ]   - implement ExplainResult interface (module/effects/capabilities)
[ ]   - implement buildTrace() function
[ ]   - diagnostic codes LN-EXPLAIN-001 through LN-EXPLAIN-004
[ ]   - create explain/ dir: explain-command.ts, explain-trace.ts, explain-tree.ts, explain-runtime.ts, explain-reporter.ts
[ ] Add LogicN plan command integration
[ ]   - estimate CPU/GPU/accelerator suitability and memory pressure
[ ]   - produce compute-plan.json
[ ]   - support --json, --runtime, --memory, --parallelism, --energy, --target, --graph, --compatibility flags
[ ]   - implement ComputePlan interface (module/recommendedTarget/fallbackTarget/parallelism/memoryPressure)
[ ]   - implement estimateTarget() function
[ ]   - diagnostic codes LN-PLAN-001 through LN-PLAN-004
[ ]   - create plan/ dir: plan-command.ts, plan-graph.ts, plan-runtime.ts, plan-memory.ts, plan-reporter.ts
[ ] Add LogicN verify deploy command integration (verify running version against build manifest)
[ ] Add LogicN promote command integration (promote artifact across environments)
[ ] Add environment mode config loading
[ ] Add structured CLI errors
[x] Add report summary output
[x] Add tests
```
