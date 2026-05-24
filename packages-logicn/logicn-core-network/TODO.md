# LogicN Core Network TODO

V1 freeze rule: this package defines network policy and report contracts only.
HTTP serving belongs in `logicn-framework-api-server`; application request
policy belongs in `logicn-framework-app-kernel`.

```text
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
[ ] Define NetworkProtocol type: "http"|"https"|"tcp"|"udp"|"grpc"|"websocket"
[ ] Define NetworkDestinationReference interface (name/protocol/host/port?/tlsRequired)
[ ] Define NetworkPermission interface (capability/destination/allowedOperations/runtimeProfiles)
[ ] Define NetworkPolicy interface (allowDestinations/denyDestinations/requireTls/allowRawSockets)
[ ] Implement GovernedNetworkRuntime class with request() validation method
[ ] Implement safeHttpRequest() wrapper — throws on policy-denied destinations
[ ] Implement validateDestination() function
[ ] Implement validateTlsRequirement() function
[ ] Implement AI provider governance (allowAiProviders, denyUnknownProviders)
[ ] Define LN-NETWORK-001 through LN-NETWORK-008 diagnostic codes
[ ] Create internal dir: network-policy.ts, network-destination.ts, network-permissions.ts, network-runtime.ts, network-audit.ts, network-diagnostics.ts, network-reports.ts
[ ] Implement deny-by-default rule (LN-NETWORK-001 for undeclared destinations)
[ ] Integrate with boundary checker for LN-BOUNDARY-008 (network allowlist violation)
```
