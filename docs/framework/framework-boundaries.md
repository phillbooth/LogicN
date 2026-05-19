# Framework: Boundaries

## Purpose

Boundaries define trust crossings in LogicN applications.

## Short Definition

A boundary is any place where data or authority crosses from one trust area into
another.

## Boundary Types

```text
route/API
package/plugin
storage
external API
event/queue
AI/tool
MCP server/tool/resource/prompt
compute target
vault
native interop
```

## Syntax Examples

```logicn
boundary storage UsersDatabase {
  type postgres
  model User
  permission use user_storage_access
}
```

```logicn
boundary external PaymentProvider {
  type api
  request ChargePaymentRequest
  response ChargePaymentResponse
  permission use payment_provider_access
}
```

## Security Rules

- Every boundary crossing must validate data.
- Every boundary crossing must check permission.
- Every boundary crossing must be reportable.
- Unknown trust must default to untrusted.
- Native, AI/tool and external boundaries require stricter reports.
- MCP boundaries must declare tools, resources, prompts, token-boundary rules,
  typed input/output, limits, effects and audit requirements before use.
- MCP tool availability is not permission; LogicN permission checks still
  decide whether a caller may use a tool or resource.

## Generated Reports

```text
boundary-report.json
external-boundary-report.json
storage-boundary-report.json
ai-tool-boundary-report.json
mcp-boundary-report.json
compute-boundary-report.json
```

## Related Boundary Concepts

- [Events](framework-events.md)
- [Repositories And Storage](framework-repositories-storage.md)
- [Adapters And Connectors](framework-adapters-connectors.md)
- [MCP AI Tool Boundaries](framework-mcp-ai-tool-boundaries.md)

## Knowledge Base

See [Core Application Model](../Knowledge-Bases/core-application-model.md) and
[Boundary Extension Concepts](../Knowledge-Bases/boundary-extension-concepts.md).
