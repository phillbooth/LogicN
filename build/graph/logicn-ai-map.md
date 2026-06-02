# LogicN AI Map

## logicn-core

LogicN / LogicN language package, examples, schemas and prototype CLI.

Provides:
- DiagnosticSeverity
- SourceLocation
- BaseDiagnostic
- CompilerDiagnostic
- TokenKind
- Token
- LexResult
- ContentBlockType
- CONTENT_BLOCK_TYPES
- TypedContentBlockExpression
- BindingKind
- BindingDeclaration

## logicn-core-compiler

LogicN compiler pipeline contracts for parsing, checking, IR, diagnostics and reports.

Provides:
- LogicNAttestation
- AttestationInputs
- AttestationKeyPair
- signAttestation
- verifyAttestation
- generateAttestationKey
- attestationToYaml
- attestationFromJson
- AuditEvent
- AuditWriter
- createAuditWriter
- buildFlowAuditEvent

## logicn-core-runtime

LogicN execution engine contracts for checked and compiled runtime execution.

Provides:
- RuntimeMode
- RuntimeEnvironment
- RuntimeDiagnosticSeverity
- RuntimeContext
- RuntimeDiagnostic
- RuntimeError
- RuntimeResult
- RuntimeEffectKind
- RuntimeEffect
- RuntimeEffectPolicy
- RuntimeEffectDecision
- RuntimeReport

## logicn-core-network

LogicN core network I/O policy, profile, permission and report contracts.

Provides:
- NetworkDirection
- NetworkProtocol
- NetworkEffect
- TlsVersion
- NetworkBackend
- NetworkDiagnosticSeverity
- NetworkDiagnostic
- TlsPolicy
- NetworkEndpointRule
- RateLimitRule
- NetworkPrivacyPolicy
- NetworkPolicy

## logicn-core-security

Reusable LogicN security primitives, redaction helpers, permission models and security report contracts.

Provides:
- SecuritySeverity
- SecretClassification
- PermissionEffect
- PermissionAction
- CryptoAlgorithm
- WeakCryptoAlgorithm
- SecureStringReference
- SecurityDiagnostic
- RedactionRule
- RedactionMatch
- RedactionFailureMode
- RedactionOptions

## logicn-core-config

LogicN project configuration, environment mode and policy loading contracts.

Provides:
- LOGICN_ENVIRONMENT_MODES
- EnvironmentMode
- ConfigDiagnosticSeverity
- ConfigDiagnostic
- ProjectPackageReference
- ProductionPackageOverride
- ConfigPathMap
- ProjectConfig
- EnvironmentVariableScope
- EnvironmentVariableReference
- EnvironmentConfig
- ProductionStrictnessPolicy

## logicn-core-reports

Shared LogicN report schemas and report-writing contracts.

Provides:
- ReportSeverity
- ReportStatus
- ReportKind
- ReportGenerator
- ReportMetadata
- ReportSourceLocation
- ReportDiagnostic
- DiagnosticSummary
- LoReportBase
- BuildReport
- SecurityReport
- TargetReport

## logicn-core-logic

LogicN multi-state logic concepts including Tri, Decision, BoolBoundary and Omni logic.

Provides:
- BoolBoundaryContext
- BoolBoundaryResult
- LLN_BOOL_BOUNDARY_001_FAILED_CLOSED
- LLN_BOOL_BOUNDARY_002_UNKNOWN_REASON
- LLN_BOOL_BOUNDARY_003_INVALID_INPUT
- LLN_BOOL_BOUNDARY_004_MISSING_BOUNDARY_NAME
- LLN_BOOL_BOUNDARY_005_RESULT_MISUSED
- boolDiagnosticFailedClosed
- boolDiagnosticUnknownReason
- boolDiagnosticInvalidInput
- boolDiagnosticMissingBoundaryName
- boolDiagnosticResultMisused

## logicn-core-vector

LogicN vector value, lane, operation and report concepts.

Provides:
- VectorDimension
- NumericElementType
- VectorType
- MatrixShape
- MatrixType
- TensorShape
- TensorType
- QuantizedType
- VectorOperation
- TensorOperation
- VectorReport
- VectorDiagnosticSeverity

## logicn-core-compute

LogicN compute planning, capability and target selection concepts.

Provides:
- ComputeTarget
- ComputeWorkloadKind
- ComputeDiagnosticSeverity
- ComputeDiagnostic
- ComputeCapability
- ComputeBudget
- ComputePlan
- ComputeAutoPolicy
- ComputeTargetSelection
- ComputeTargetPreference
- ComputeDataLocation
- ComputeDataMovement

## logicn-ai

LogicN AI inference contracts, model metadata, safety policy and reports.

Provides:
- AiTaskKind
- AiOutputTrust
- AiModelFormat
- AiInferenceTarget
- AiDiagnosticSeverity
- AiDiagnostic
- AiMemoryEstimate
- AiModelCapability
- AiModelDescriptor
- AiModelRegistryEntry
- AiModelRegistry
- AiTargetSelection

## logicn-ai-lowbit

LogicN low-bit AI inference contracts with BitNet as an optional backend.

Provides:
- LowBitAiTarget
- LowBitAiBackendId
- LowBitAiDevice
- LowBitAiWeightFormat
- LowBitAiQuantization
- LowBitAiEmbeddingQuantization
- LowBitAiKernelFamily
- LowBitAiRuntimeKind
- LowBitAiDiagnosticSeverity
- LowBitAiDiagnostic
- LowBitAiBackendAdapter
- LowBitAiModelReference

## logicn-ai-agent

LogicN supervised AI agent, tool permission, task group and report contracts.

Provides:
- AgentToolDecision
- AgentFailureBehaviour
- AgentToolPermission
- AgentLimits
- AgentDefinition
- AgentTaskGroupPlan
- AgentFinding
- AgentResult
- AgentMergePolicy
- AgentReport

## logicn-ai-neural

LogicN neural network model, layer, inference and training boundary contracts.

Provides:
- NeuralTask
- ActivationFunction
- LossFunction
- OptimizerName
- TensorShapeRef
- NeuralTensorRef
- NeuralLayer
- NeuralModelDefinition
- NeuralInferencePlan
- NeuralTrainingPlan
- NeuralReport
- NeuralDiagnosticSeverity

## logicn-ai-neuromorphic

LogicN neuromorphic and spiking event model contracts.

Provides:
- Spike
- SpikeTrain
- EventSignal
- SpikingModel
- NeuromorphicPlan
- NeuromorphicReport

## logicn-data

LogicN data processing package umbrella contracts.

## logicn-data-html

LogicN HTML parse, sanitize, render and search document contracts.

## logicn-data-search

LogicN search document, indexing, query and search report contracts.

## logicn-data-archive

LogicN archive manifest, integrity and restore report contracts.

## logicn-data-db

LogicN typed database boundary contracts for model, query, command, response, archive and report flows.

## logicn-data-model

LogicN typed database model, field classification and storage mapping contracts.

## logicn-data-query

LogicN typed query, command, parameterisation and database access report contracts.

## logicn-data-response

LogicN safe database-model-to-response mapping and response report contracts.

## logicn-data-json

LogicN JSON streaming, validation, redaction and archive contracts.

## logicn-data-database

LogicN database export, snapshot, checksum and archive contracts.

## logicn-data-pipeline

LogicN bounded streaming data pipeline, backpressure and checkpoint contracts.

## logicn-data-reports

LogicN data processing, HTML, search, archive and pipeline report contracts.

## logicn-web

LogicN browser-safe web package umbrella contracts.

## logicn-web-render

LogicN typed safe browser rendering pipeline contracts.

## logicn-web-state

LogicN browser client state and state-diff contracts.

## logicn-web-components

LogicN typed browser component boundary contracts.

## logicn-web-router

LogicN browser route and navigation contracts.

## logicn-web-events

LogicN typed browser event contracts.

## logicn-db-postgres

LogicN PostgreSQL adapter contract placeholder.

## logicn-db-mysql

LogicN MySQL adapter contract placeholder.

## logicn-db-sqlite

LogicN SQLite adapter contract placeholder.

## logicn-db-opensearch

LogicN OpenSearch adapter contract placeholder.

## logicn-db-firestore

LogicN Firestore adapter contract placeholder.

## logicn-core-photonic

LogicN photonic and wavelength concepts, models, APIs and simulation contracts.

Provides:
- Wavelength
- Phase
- Amplitude
- OpticalSignal
- OpticalChannel
- PhotonicMapping
- PhotonicMode
- PhotonicDiagnosticSeverity
- PhotonicDiagnostic
- PhotonicPlan
- PhotonicReport
- defineOpticalSignal

## logicn-target-cpu

LogicN CPU target capability, fallback and execution planning contracts.

Provides:
- CpuArchitecture
- CpuSimdFeature
- CpuWorkloadClass
- CpuThreadingPolicy
- CpuTargetCapability
- CpuTargetPlan
- CpuTargetReport
- CpuFeatureProbe
- CpuTargetDiagnosticSeverity
- CpuTargetDiagnostic
- CpuCalibrationSample
- CpuCalibrationReport

## logicn-cpu-kernels

LogicN optimized CPU kernel contracts for scalar, vector, matrix and low-bit workloads.

Provides:
- CpuKernelOperation
- CpuKernelDataType
- CpuKernelFeature
- CpuKernelTilePlan
- CpuKernelPlan
- CpuKernelBenchmark
- CpuKernelReport
- CpuKernelNativeAbi
- CpuKernelCalibrationEntry
- CpuKernelCalibrationCache
- CpuKernelDiagnosticSeverity
- CpuKernelDiagnostic

## logicn-target-native

LogicN future native executable and ABI target planning concepts.

Provides:
- NativeAbi
- NativeTarget
- NativeArtifact
- NativeTargetReport

## logicn-target-js

LogicN JavaScript output target planning contracts.

## logicn-target-wasm

LogicN WebAssembly target planning and output contracts.

Provides:
- WasmTarget
- WasmArtefact
- WasmTargetReport

## logicn-target-gpu

LogicN GPU target planning and output contracts.

Provides:
- GpuTargetCapability
- GpuKernelPlan
- GpuTargetReport

## logicn-target-ai-accelerator

LogicN NPU, TPU and AI accelerator target planning contracts.

Provides:
- AiAcceleratorKind
- AiAcceleratorWorkloadKind
- AiAcceleratorPrecision
- AiAcceleratorFramework
- AiAcceleratorModelFormat
- AiAcceleratorAdapterId
- AiAcceleratorDiagnosticSeverity
- AiAcceleratorDiagnostic
- AiAcceleratorTopology
- AiAcceleratorMemoryProfile
- AiAcceleratorBackendProfile
- AiAcceleratorCapability

## logicn-target-photonic

LogicN photonic target backend planning concepts.

Provides:
- PhotonicActualTarget
- PhotonicTargetStatus
- PhotonicOperationKind
- OpticalInterconnectMode
- OpticalTransferFormat
- PhotonicTargetCapability
- OpticalIoCapability
- PhotonicTargetInput
- PhotonicLoweringPlan
- PhotonicOperationMapping
- UnsupportedPhotonicOperation
- PhotonicSimulationTarget

## logicn-framework-app-kernel

Optional LogicN secure runtime kernel design for typed APIs, validation, auth, workload controls, jobs and reports.

## logicn-framework-api-server

`logicn-framework-api-server` is the first concrete HTTP API-serving package for LogicN.

## logicn-core-cli

LogicN developer command-line interface for checking, building, serving, reporting and running safe tasks.

Provides:
- parseEnvironment
- commands
- findCommand
- createCoreCommandRunner
- relativeCoreCompilerPath
- spawn
- Dirent
- Stats
- mkdir
- readdir
- readFile
- stat

## logicn-core-tasks

Safe typed task runner for LogicN project automation.

Provides:
- checkTaskPermissions
- TaskDependencyPlan
- resolveTaskDependencies
- DryRunPlan
- createDryRunPlan
- dryRunTask
- LoadedTasks
- parseTasksSource
- readFile
- RunTaskOptions
- TaskReport
- TaskRunReport

## logicn-tools-benchmark

LogicN benchmark and diagnostics contracts for logic, compute targets, fallback behaviour and safe reporting.

Provides:
- BenchmarkMode
- BenchmarkTrigger
- BenchmarkTarget
- BenchmarkStatus
- BenchmarkPrivacyPolicy
- BenchmarkConfig
- BenchmarkSystemInfo
- BenchmarkTestResult
- BenchmarkScores
- BenchmarkReport
- BenchmarkSubmitPayload
- DEFAULT_BENCHMARK_CONFIG

## logicn-devtools-graph-project

LogicN project knowledge graph contracts for package, document, policy and report relationships.

Provides:
- ProjectGraphNodeKind
- ProjectGraphEdgeKind
- ProjectGraphConfidence
- ProjectGraphDiagnosticSeverity
- ProjectGraphBackendId
- ProjectGraphBackendSourceKind
- ProjectGraphBackendCapability
- ProjectGraphDiagnostic
- ProjectGraphNode
- ProjectGraphEdge
- ProjectGraph
- ProjectGraphWorkspacePackage

## logicn-framework-example-app

`packages-logicn/logicn-framework-example-app` is the bespoke application package for this workspace.
