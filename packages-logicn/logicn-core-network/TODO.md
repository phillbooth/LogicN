# LogicN Core Network TODO

V1 freeze rule: this package defines network policy and report contracts only.
HTTP serving belongs in `logicn-framework-api-server`; application request
policy belongs in `logicn-framework-app-kernel`.

```text
[ ] Audit docs for legacy ws/wss, sharedSecret, exists/save and has/store wording and map or replace with canonical v0.2 names
[x] Create /packages-logicn/logicn-core-network
[x] Add README.md
[x] Add package metadata
[x] Add TODO.md
[x] Add typed network policy exports
[x] Define TLS policy contract
[x] Define endpoint allow/deny rules
[x] Define backend capability and safe auto-selection contract
[x] Define network report contract
[x] Add tests
[x] Add examples
[ ] Wire network reports into compiler/runtime reports
[ ] Extend NetworkProtocol to add "quic": "http"|"https"|"tcp"|"udp"|"grpc"|"websocket"|"quic"
[ ] Upgrade NetworkDestinationReference: add provider, category, dataCategories
[ ] Upgrade NetworkPolicy: add default (allow|deny), allowPlainHttp, aiProviders[], requireTimeouts, requireRateLimits
[ ] Implement productionNetworkPolicy const with SSRF-safe deny list (localhost, 127.0.0.1, 0.0.0.0, 169.254.169.254, metadata.google.internal, metadata.azure.internal)
[ ] Define AiProviderNetworkPolicy: provider, allowedEndpoints, requireApiKeyCapability, dataCategories, auditRequired
[ ] Define OPENAI_POLICY const
[ ] Define GovernedNetworkRuntime interface: policy, validate(), request()
[ ] Define SafeHttpRequestInput: destination, method, headers, body?, timeoutMs, capability
[ ] Define SafeHttpResponse: status, headers, body, destination
[ ] Implement validateDestination(destination, policy): NetworkDiagnostic[]
[ ] Implement validateTlsRequirement(destination, policy): NetworkDiagnostic[]
[ ] Implement validateCapability(capability, policy): NetworkDiagnostic[]
[ ] Implement safeHttpRequest(input, runtime): Promise<SafeHttpResponse>
[ ] Define WebhookVerificationConfig: secret, algorithm, headerName, timestampHeader?, maxAgeSeconds
[ ] Define WebhookVerificationResult: valid, reason?, diagnostics[]
[ ] Implement verifyWebhookHmac(payload, signature, config): WebhookVerificationResult
[ ] Implement validateWebhookTimestamp(timestamp, maxAgeSeconds): WebhookVerificationResult
[ ] Define ReplayStore interface: insertOnce(), has()
[ ] Implement validateReplayProtection(id, store): Promise<NetworkDiagnostic[]>
[ ] Define IdempotencyStore interface: getOrSet()
[ ] Implement validateIdempotency(key, store): Promise<NetworkDiagnostic[]>
[ ] Implement validateAiPrompt(prompt, policy): NetworkDiagnostic[]
[ ] Define NetworkDiagnostic: code, message, severity, destination?
[ ] Define NetworkPolicyReport with schemaVersion "logicn.network.report.v1"
[ ] Define LN-NETWORK-001 through LN-NETWORK-008 diagnostic codes
[ ] Create internal dir: policy/, runtime/, webhook/, reports/, diagnostics/
[ ] Implement deny-by-default rule (LN-NETWORK-001 for undeclared destinations)
[ ] Integrate with boundary checker for LN-BOUNDARY-008 (network allowlist violation)
```
