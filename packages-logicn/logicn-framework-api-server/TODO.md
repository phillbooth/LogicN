# LogicN API Server TODO

```text
[x] Create /packages-logicn/logicn-framework-api-server
[x] Add README.md
[x] Document package boundary
[ ] Add package metadata if/when implementation starts
[ ] Add tsconfig.json if/when TypeScript implementation starts
[ ] Define HttpMethod union: GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS (7 values)
[ ] Define LogicnApiManifest schema v1: schemaVersion "logicn.api.manifest.v1", routes[], serverPolicy
[ ] Define LogicnRouteManifest: id, method, path, handler, requestType?, responseType?, auth, body, limits, idempotency, webhook, effects, reports
[ ] Define BodyPolicy: maxBytes, required, allowUnknownFields (false), allowDuplicateKeys (false), allowNullValues (false), requireUtf8 (true)
[ ] Define RouteLimits: rateLimit, maxBodyBytes, timeoutMs
[ ] Define AuthPolicy: required, type, scope[]
[ ] Define IdempotencyPolicy: enabled, headerName, store
[ ] Define WebhookPolicy: enabled, verify, algorithm, headerName, replayProtection
[ ] Define EffectsPolicy: allowedEffects[], deniedEffects[]
[ ] Define RouteReportPolicy: audit, evidence, proofs
[ ] Define LogicnAppKernel interface: manifest, handle(request): Promise<KernelResponse>
[ ] Define LogicnKernelRequest: routeId, method, path, headers, body, raw
[ ] Define LogicnKernelResponse: status, headers, body, diagnostics[]
[ ] Implement startApiServer(manifest, kernel): Promise<void>
[ ] Implement readBodyWithLimit(req, maxBytes): Promise<Buffer> — throws 413 LogicnHttpError on oversize
[ ] Implement handleApiRequest pipeline: assertContentType → assertRateLimit → assertAuth → decodeRequestBody → validateType → assertEffectsAllowed → callFlow
[ ] JSON rules: unknown fields deny (LN-API-003), duplicate keys deny (LN-API-004), silent null deny (LN-API-005), UTF-8 required (LN-API-006)
[ ] Implement verifyHmacSha256Webhook(payload, signature, secret): boolean
[ ] Implement timingSafeHexEqual(a, b): boolean
[ ] Define WebhookReplayPolicy, WebhookIdempotencyPolicy
[ ] Implement assertWebhookNotReplayed(id, store): Promise<void>
[ ] Define ReplayStore interface: insertOnce(id, expiresAt): Promise<boolean>
[ ] Define ReplayStore adapters: memory, sqlite, postgres, redis, cloud KV
[ ] Implement exportOpenApi(manifest): OpenApiSpec
[ ] Define LogicnHttpError(status, code, message): extends Error
[ ] Implement mapErrorToHttpResponse(error): { status, body }
[ ] HTTP status code handling: 200 success, 400 bad request, 401 unauthorized, 403 forbidden, 404 not found, 405 method not allowed, 409 conflict, 410 gone (replay), 413 body too large, 415 unsupported media type, 422 validation error, 429 rate limited, 500 internal error, 502 upstream error, 503 service unavailable, 504 timeout
[ ] Implement assertNetworkAllowed(destination, policy): void
[ ] Define Node-hosted API server adapter contract
[ ] Define API manifest input contract
[ ] Define server config contract
[ ] Define request normalisation contract
[ ] Define route matching contract
[ ] Define kernel handoff contract
[ ] Define safe response contract
[ ] Define server-level limit policy
[ ] Define logging and redaction contract
[ ] Define API server report format
[ ] Define host runtime report fields for Node-hosted serving
[ ] Create src layout: routes/, middleware/, kernel/, webhook/, openapi/, errors/, reports/
[ ] Build output: build/manifest/api-manifest.json, build/reports/route-report.json
[ ] Add examples
[ ] Add tests
```
