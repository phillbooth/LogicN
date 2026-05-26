# LogicN Package Boundaries

This document explains which LogicN concepts belong in `logicn-core` and which concepts
belong in sibling packages.

`logicn-core` should stay focused on the language, compiler-facing syntax, core type
rules, safety model, report contracts and examples needed to describe the
language.

It should not absorb every future LogicN package.

If `docs/COVERAGE.md` records conflicting public contract shapes, do not treat
the conflict as implementable. Update the owning package docs to either choose
one canonical shape or mark the conflict as unresolved.

## Package Ownership

```text
packages-logicn/logicn-core
  Bool
  Option
  Result
  basic flow syntax
  basic type rules
  effects syntax
  compiler diagnostics
  report contracts
  language examples

packages-logicn/logicn-core-compiler
  lexer
  parser
  AST
  checker pipeline
  IR
  diagnostics
  source maps
  compiler reports

packages-logicn/logicn-core-runtime
  checked execution
  compiled execution
  effect dispatch
  runtime memory policy
  runtime error handling
  runtime reports

packages-logicn/logicn-core-security
  SecureString helper model
  redaction primitives
  permission model types
  security diagnostics
  security report contracts

packages-logicn/logicn-core-config
  project config shape
  environment modes
  config validation diagnostics
  production policy loading

packages-logicn/logicn-core-reports
  shared report metadata
  shared diagnostics
  report schema contracts
  processing report contracts
  report writer contracts

packages-logicn/logicn-core-logic
  Tri
  LogicN
  Decision
  RiskLevel
  Omni logic
  multi-state logic rules
  conversion rules
  truth tables
  logic reports

packages-logicn/logicn-core-vector
  Vector<T, N>
  Matrix<T, R, C>
  Tensor<T, Shape>
  Shape
  numeric element contracts
  vector dimensions
  vector lanes
  vector operations
  tensor operations
  vector safety rules
  vector reports

packages-logicn/logicn-core-compute
  compute planning
  compute capabilities
  compute budgets
  offload planning
  fallback planning
  target selection
  compute reports

packages-logicn/logicn-ai
  AI model metadata
  prompt and response contracts
  inference options
  AI safety policy
  AI inference reports

packages-logicn/logicn-ai-lowbit
  low-bit model references
  GGUF model metadata
  low-bit and ternary quantization declarations
  backend selection contracts
  CPU low-bit inference plans
  low-bit inference reports

packages-logicn/logicn-ai-agent
  agent definitions
  agent tool permissions
  agent limits
  supervised task group plans
  merge policies
  agent reports

packages-logicn/logicn-ai-neural
  neural model definitions
  neural layers
  activation functions
  inference boundaries
  training boundaries
  neural reports

packages-logicn/logicn-ai-neuromorphic
  Spike
  SpikeTrain
  EventSignal<T>
  spiking model contracts
  neuromorphic reports

packages-logicn/logicn-core-photonic
  Wavelength
  Phase
  Amplitude
  OpticalSignal
  OpticalChannel
  photonic simulation concepts
  logic-to-light vocabulary
  photonic runtime target semantics
  photonic execution plan semantics
  LLN-PHOTONIC diagnostics after reconciliation

packages-logicn/logicn-target-cpu
  CPU architecture metadata
  SIMD capability reports
  threading policy
  memory limits
  CPU fallback reports

packages-logicn/logicn-cpu-kernels
  GEMM and GEMV kernel contracts
  vector and matrix kernel plans
  low-bit operation contracts
  ternary operation contracts
  tiling and threading plans

packages-logicn/logicn-target-native
  native target metadata
  native artifact planning
  platform triples
  ABI requirements
  native target reports

packages-logicn/logicn-target-wasm
  WASM target metadata
  WASM module output planning
  import/export contracts
  WASM target reports

packages-logicn/logicn-target-gpu
  GPU target capabilities
  GPU plan output
  kernel mapping plans
  precision and data movement reports

packages-logicn/logicn-target-ai-accelerator
  NPU and TPU target capabilities
  AI-chip target planning
  passive accelerator backend profiles
  precision compatibility reports
  accelerator memory and topology reports
  model operation mapping plans
  accelerator fallback reports

packages-logicn/logicn-target-photonic
  photonic backend target plans
  optical I/O interconnect plans
  photonic target capabilities
  optical interconnect capabilities
  logic-to-photonic lowering plans
  data movement reports
  photonic target reports

packages-logicn/logicn-framework-app-kernel
  typed API boundary enforcement
  validation policy
  auth policy
  rate-limit policy
  idempotency and replay protection
  queue/job contracts
  runtime and audit reports

packages-logicn/logicn-framework-api-server
  HTTP listening
  request normalisation
  route manifest loading
  server-level limits
  safe HTTP responses

packages-logicn/logicn-core-cli
  developer commands
  check/build/run/serve/report commands
  safe output formatting
  task command dispatch

packages-logicn/logicn-core-tasks
  safe project automation
  task effects and permissions
  dry run mode
  task reports
  unsafe shell gates

packages-logicn/logicn-tools-benchmark
  benchmark configuration
  benchmark task definitions
  light/full/stress benchmark modes
  target fallback diagnostics
  privacy-safe benchmark reports
  shareable benchmark payload contracts

packages-logicn/logicn-devtools-project-graph
  project graph nodes and relationships
  package ownership maps
  documentation and decision links
  graph output manifests
  AI assistant map contracts
```

## Update Rule

When changing a concept, update the owning package first.

Examples:

```text
Tri conversion rule changes
  update packages-logicn/logicn-core-logic first
  update logicn-core docs only if syntax or compiler checking changes

Vector lane rules
  update packages-logicn/logicn-core-vector first
  update logicn-core docs only if language syntax changes

Compute target selection
  update packages-logicn/logicn-core-compute first
  update logicn-core docs only if compute block syntax changes

AI inference contracts
  update packages-logicn/logicn-ai first
  update logicn-core docs only if package registry or effect syntax changes

Low-bit AI backend
  update packages-logicn/logicn-ai-lowbit, packages-logicn/logicn-target-cpu or packages-logicn/logicn-cpu-kernels first
  update logicn-core docs only if compute target syntax or report contracts change

Parallel AI agent orchestration
  update packages-logicn/logicn-ai-agent first
  update packages-logicn/logicn-core-runtime only if structured concurrency contracts change
  update packages-logicn/logicn-core-security only if permission or tool safety contracts change
  update logicn-core docs only if async/task_group/spawn syntax changes

Neural model or training boundary changes
  update packages-logicn/logicn-ai-neural first
  update packages-logicn/logicn-core-vector only if tensor shape contracts change
  update logicn-core docs only if language-level compute syntax changes

Neuromorphic event or spiking model changes
  update packages-logicn/logicn-ai-neuromorphic first
  update target packages only if hardware planning changes

AI accelerator target changes
  update packages-logicn/logicn-target-ai-accelerator first
  update packages-logicn/logicn-core-compute only if target selection contracts change

AI accelerator vendor profile changes
  update docs/AI_ACCELERATOR_TARGETS.md and packages-logicn/logicn-target-ai-accelerator first
  update packages-logicn/logicn-tools-benchmark only if benchmark target contracts change
  update logicn-core docs only if target syntax or package registry contracts change

Photonic wavelength model
  update packages-logicn/logicn-core-photonic first
  update logicn-core docs only if language-level target declarations change

Photonic backend lowering
  update packages-logicn/logicn-target-photonic first
  update logicn-core docs only if target report contracts change

Optical I/O or interconnect planning
  update docs/OPTICAL_IO.md and packages-logicn/logicn-target-photonic first
  update packages-logicn/logicn-core-compute only if target selection or data movement contracts change
  update packages-logicn/logicn-tools-benchmark only if benchmark target contracts change
  update logicn-core docs only if target syntax or package registry contracts change

WASM or GPU target backend changes
  update packages-logicn/logicn-target-wasm or packages-logicn/logicn-target-gpu first
  update logicn-core docs only if target syntax or report contracts change

Security primitive changes
  update packages-logicn/logicn-core-security first
  update logicn-core docs only if language security syntax or compiler checks change

Runtime execution changes
  update packages-logicn/logicn-core-runtime first
  update logicn-core docs only if language runtime contracts change

Resilient flow or controlled recovery changes
  update docs/RESILIENT_FLOWS.md first for workspace-level policy
  update packages-logicn/logicn-core-runtime first for supervision, retry and checkpoint behavior
  update packages-logicn/logicn-core-reports first for processing report shape changes
  update logicn-core docs only if resilient/recover syntax changes

Compiler pipeline changes
  update packages-logicn/logicn-core-compiler first
  update logicn-core docs only if language contracts or schemas change

Config or report shape changes
  update packages-logicn/logicn-core-config or packages-logicn/logicn-core-reports first
  update logicn-core docs only if compiler output contracts change

CLI command behaviour
  update packages-logicn/logicn-core-cli first
  update logicn-core docs only if compiler command contracts change

Safe task automation
  update packages-logicn/logicn-core-tasks first
  update logicn-core docs only if package registry or task syntax changes

Benchmark diagnostics
  update packages-logicn/logicn-tools-benchmark first
  update target packages only if capability detection contracts change
  update packages-logicn/logicn-core-reports only if shared report schemas change
  update logicn-core docs only if benchmark syntax or package registry contracts change

Project knowledge graph tooling
  update packages-logicn/logicn-devtools-project-graph first
  update logicn-core docs only if compiler reports or package registry contracts change
```

## Core Reference Policy

`logicn-core` may reference sibling packages to explain boundaries, imports and
compiler report contracts.

`logicn-core` should avoid owning package implementation details such as:

```text
HTTP server internals
auth provider implementation
task runner execution
benchmark runner implementation
project graph extraction implementation
photonic hardware backend code
binary emitter implementation
AI model runtime implementation
BitNet or other low-bit backend adapter implementation
vector runtime kernels
compute scheduler implementation
CLI command UX details
framework conventions
CMS/admin/frontend features
```

## Future Repository Split

The current workspace may keep packages in one root repository while boundaries
are still changing.

The future layout may split reusable packages into their own repository:

```text
light-framework/.git
light-framework/packages-logicn/.git
```

When that split happens, `logicn-core` docs should continue to reference sibling
packages by package name and path, but implementation details should remain in
the owning package repository.
