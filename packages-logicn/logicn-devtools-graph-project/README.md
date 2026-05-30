# LogicN Project Graph

`logicn-devtools-project-graph` is the package for LogicN project knowledge graph contracts.

It belongs in:

```text
/packages-logicn/logicn-devtools-project-graph
```

Use this package for:

```text
project graph nodes
project graph relationships
package ownership maps
document and decision links
policy and unsafe feature classification
report output manifests
AI assistant map files
graph query, path and explain request contracts
backend selection policy
workspace package/doc scanner
Markdown report and AI map rendering
graph query, explain and path helpers
```

## Backend Role

`logicn-devtools-project-graph` should expose generic LogicN graph contracts and commands. It
should not expose one tool name as source syntax or CLI syntax.

Stable LogicN surface:

```text
LogicN graph
LogicN graph --out build/graph
project graph nodes and edges
project graph reports
```

Swappable backend implementations:

```text
LogicN_native
graphify
static_analyser
docs_indexer
future_standard
```

Graphify-style tooling is useful as inspiration and can be used as an optional
backend, including from a pinned Git package. The LogicN graph output should still
use LogicN-native node, edge, manifest and report contracts so the backend can be
replaced later without renaming commands or generated file formats.

Git backends must be explicitly allowed by backend policy and pinned to a ref.
Model-assisted extraction remains opt-in.

This package must not become part of LogicN core, compile-time security enforcement
or production runtime.

## Boundary

`logicn-devtools-project-graph` explains relationships. It does not enforce security,
compile source code, run tasks, serve HTTP or replace compiler checks.

## Native Mapper

The package includes a LogicN-native workspace graph builder that can consume:

```text
logicn.workspace.json package paths
README and TODO documents
package.json metadata
TypeScript exported contracts
top-level docs
generated JSON report examples
```

It maps packages, documents, exported contracts and package references into a
stable graph. The CLI can render:

```text
build/graph/logicn-devtools-project-graph.json
build/graph/LogicN_GRAPH_REPORT.md
build/graph/logicn-ai-map.md
build/graph/logicn-devtools-project-graph.html
```

Run the current local CLI build from the repository root:

```text
node packages-logicn\logicn-core-cli\dist\index.js graph --out build\graph
```

Once `logicn-core-cli` is installed or linked, the intended shorthand is:

```text
LogicN graph --out build\graph
```

It can also query generated graph output:

```text
node packages-logicn\logicn-core-cli\dist\index.js graph query logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph explain package:logicn-core-security --out build\graph
node packages-logicn\logicn-core-cli\dist\index.js graph path package:logicn-devtools-project-graph report:project-graph --out build\graph

LogicN graph query logicn-core-security
LogicN graph explain package:logicn-core-security
LogicN graph path package:logicn-devtools-project-graph report:project-graph
```

Final rule:

```text
logicn-devtools-project-graph maps and explains the project.
graphify is one possible backend, not LogicN syntax.
logicn-core and logicn-core-compiler define language checks.
logicn-core-security and runtime packages enforce policy.
```
