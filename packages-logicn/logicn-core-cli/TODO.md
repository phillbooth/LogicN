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
[ ] Add LogicN deploy command integration
[ ]   - load workspace manifest, runtime profile, deployment policy
[ ]   - validate effects, capabilities, runtime targets, module hashes
[ ]   - produce deployment-report.json
[ ]   - support --dry-run, --json, --report, --audit, --strict flags
[ ]   - return exit codes 0–7
[ ] Add LogicN explain command integration
[ ]   - explain imports, effects, capabilities, dependency tree
[ ]   - explain denial reasoning from deployment-denial.json
[ ]   - support --tree, --trace, --effects, --capabilities, --runtime, --policy, --audit, --json flags
[ ] Add LogicN plan command integration
[ ]   - estimate CPU/GPU/accelerator suitability and memory pressure
[ ]   - produce compute-plan.json
[ ]   - support --json, --runtime, --memory, --parallelism, --energy, --target, --graph flags
[ ] Add LogicN verify deploy command integration (verify running version against build manifest)
[ ] Add LogicN promote command integration (promote artifact across environments)
[ ] Add environment mode config loading
[ ] Add structured CLI errors
[x] Add report summary output
[x] Add tests
```
