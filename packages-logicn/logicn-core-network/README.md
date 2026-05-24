# LogicN Core Network

`logicn-core-network` is the package for LogicN network I/O policy, profile,
permission and report contracts.

It belongs in:

```text
/packages-logicn/logicn-core-network
```

## Position

LogicN should not claim to make Ethernet hardware faster. Physical network
speed is controlled by hardware, standards, drivers, cables, switches, NICs and
operating systems.

LogicN also cannot make packets invisible. Routers, switches, ISPs, Wi-Fi
access points, cloud providers and attackers on the path may still observe that
packets exist. LogicN's job is to make packet contents encrypted,
authenticated, permissioned, minimised and auditable.

LogicN can improve how applications use network I/O:

```text
typed network APIs
deny-by-default network permissions
TLS and certificate policy
mutual TLS and service identity policy
application-layer encryption contracts for sensitive payloads
metadata minimisation policy
secret-safe URL, header and logging rules
route-level rate limits
safe backpressure
zero-copy planning where available
platform-aware async I/O backend selection
optional eBPF/XDP edge filtering
optional DPDK adapter contracts
network observability reports
deployment-aware network profiles
network benchmark inputs
```

## Boundary

Use this package for:

```text
network permission vocabulary
network policy contracts
network auto planning
network profile contracts
TLS policy shape
mutual TLS and service identity policy
application-layer encryption policy for sensitive payloads
metadata minimisation policy
secret-safe URL, header and logging rules
port and host allowlist contracts
raw socket restrictions
zero-copy and buffering policy
io_uring, IOCP and kqueue backend capability vocabulary
eBPF/XDP adapter contracts
DPDK adapter contracts
backpressure and timeout requirements
network report contracts
network benchmark input contracts
```

Do not use this package for:

```text
full HTTP framework behavior
actual TLS implementation
DNS resolver implementation
kernel driver code
packet capture implementation
DPDK runtime bindings
vendor SDK bindings
firewall product logic
application route handlers
```

`logicn-framework-api-server` owns HTTP server behavior.
`logicn-framework-app-kernel` owns request lifecycle and app policy enforcement.
`logicn-core-security` owns permission decisions, redaction and security report
checks. `logicn-core-reports` owns shared report shape conventions.

## Governance Model

`logicn-core-network` is a governance-first runtime system. Its purpose is to
provide explicit network permissions, runtime-aware destination validation,
safe secret transmission, and audit-grade network evidence.

Governance rules:

```text
policy-governed
capability-controlled
auditable
explicit
deny-by-default
runtime-validated
```

### Core Governance Types

```ts
export type NetworkProtocol = "http" | "https" | "tcp" | "udp" | "grpc" | "websocket"

export interface NetworkDestinationReference {
  name: string
  protocol: NetworkProtocol
  host: string
  port?: number
  tlsRequired: boolean
}

export interface NetworkPolicy {
  allowDestinations: NetworkDestinationReference[]
  denyDestinations: string[]
  requireTls: boolean
  allowRawSockets: boolean
}
```

`GovernedNetworkRuntime` validates requests against policy before traffic is
allowed. `safeHttpRequest()` wraps the runtime with a policy-checked request path.

### Network Effect Declaration

Network access must declare the `network` effect:

```logicn
fn fetch_user(id: UserId) effect network capability HttpClient {
    return http.get("/users/" + id)
}
```

### Forbidden Defaults

```text
network.any
rawSocket
packetCapture
promiscuousMode
```

These require explicit governance approval.

### AI Networking Governance

AI systems must not silently exfiltrate data. The runtime must always know:
which AI provider is contacted, which capability allowed it, which data
categories were transmitted, and which policy approved it.

### Diagnostic Codes (LN-NETWORK series)

| Code | Meaning |
| --- | --- |
| `LN-NETWORK-001` | undeclared network destination |
| `LN-NETWORK-002` | capability missing for network operation |
| `LN-NETWORK-003` | insecure transport denied |
| `LN-NETWORK-004` | raw socket denied |
| `LN-NETWORK-005` | destination not allowlisted |
| `LN-NETWORK-006` | secret flow to unapproved destination |
| `LN-NETWORK-007` | AI provider not approved |
| `LN-NETWORK-008` | runtime network policy unavailable |

Internal structure: `network-policy.ts`, `network-destination.ts`,
`network-permissions.ts`, `network-runtime.ts`, `network-audit.ts`,
`network-diagnostics.ts`, `network-reports.ts`.

See `docs/Knowledge-Bases/logicn-core-network-governance.md` for the full
governance specification.

## Core Concepts

### Network Policy

```text
network {
    default: deny

    allow outbound https to ["api.example.com"]
    allow inbound https on port 443
    deny http
    deny plaintextTcp
    deny rawSocket
    deny shellNetworkTools
    require tls
    require rateLimits
}
```

Network access is security-sensitive. Inbound ports, outbound hosts, raw
sockets, packet capture, promiscuous mode and shell network tools must be
explicitly declared and reportable.

### Safe Networking Rule

```text
LogicN should not trust the network.
LogicN should assume packets can be observed, copied, delayed, blocked or modified.
LogicN must encrypt, authenticate, validate, minimise and report network communication.
```

### Network Auto

`network auto` should select the safest available I/O backend for the platform.

```text
network auto {
    prefer zeroCopy
    prefer ioUring
    maxBodyMb: 500
    timeoutMs: 30000
    fallback buffered
}
```

The runtime can map this to Linux `io_uring`, Linux zero-copy socket paths,
Windows IOCP-style backends, macOS kqueue-style backends or safe async sockets.
Unsupported advanced features must fall back safely.

### Zero-Copy Policy

```text
network io {
    mode: auto
    preferZeroCopy: true
    fallback: buffered
    maxBufferMb: 256
}
```

Zero-copy is a capability, not a promise. It must never bypass validation, auth,
rate limits, TLS, backpressure or redaction policy.

### Edge Filtering

```text
network edgeFilter {
    target: xdp
    allow tcp ports [443]
    deny privateAdminPorts
    rateLimit ip: "1000/minute"
    drop malformedPackets
    report: true
}
```

eBPF/XDP support is advanced and optional.

### DPDK Adapter

```text
network target dpdk {
    useFor: ["packet_processing", "firewall", "load_balancer"]
    requireDedicatedCores: true
    requireHugePages: true
    fallback: kernelNetworkStack
}
```

DPDK is for specialist data-plane workloads, not default web applications.

### TLS Policy

```text
tls {
    require: true
    minVersion: "TLS1.3"
    verifyCertificates: true
    denySelfSignedInProduction: true
    certificatePinning: optional
    allowDowngrade: false
    allowPlaintextFallback: false
}
```

Production builds should fail if TLS verification is disabled for public or
private routes that require secure transport.

Strict production network profiles must require certificate validation and
hostname validation, and must deny expired certificates, weak ciphers, debug
proxies, plaintext fallback and silent downgrade.

### Mutual TLS and Service Identity

```text
service OrdersApi {
    identity: "orders-api"

    allow calls to [
        "payments-api",
        "stock-api"
    ]

    deny calls to [
        "admin-api",
        "secrets-service"
    ]

    require mutualTls
}
```

Enterprise service calls should be authenticated in both directions where the
deployment profile requires it.

### Application-Layer Encryption

```text
payload CustomerRecord {
    encryption: endToEnd
    decryptOnlyAt: "trusted-service.customer-api"
}
```

Application-layer encryption is for sensitive payloads that pass through
intermediate services, queues, gateways, proxies or logging systems.

### Metadata and Secret Minimisation

```text
network privacy {
    minimiseMetadata: true
    batchSmallMessages: true
    avoidSensitiveDataInUrls: true
    denyQueryStringSecrets: true
}
```

Secrets must not be placed in URLs, unredacted headers, logs or unapproved
outbound calls. Credential headers must be typed and redacted in reports.

### Backpressure

```text
stream HttpRequestBody {
    maxInFlightMb: 64
    backpressure: required
    onOverflow: reject
}
```

Network streams need bounded buffering, explicit overflow behavior and timeout
policy.

## Keep-Alive And Transport Policy

`logicn-core-network` owns the policy model for connection reuse and transport
capabilities. HTTP serving remains owned by `logicn-framework-api-server`, but
network policy should describe what transports and pools are allowed.

LogicN should treat HTTP/1.x keep-alive, HTTP/2 multiplexing and HTTP/3/QUIC as
deployment-profile capabilities, not as core language syntax.

Conceptual transport policy:

```logicn
network transport {
  http1 {
    keepAlive: true
    idleTimeoutMs: 5000
    maxRequestsPerConnection: 200
  }

  http2 {
    enabled: auto
    multiplexing: true
  }

  http3 {
    enabled: optional
    requireProfile: "edge-modern"
  }
}
```

Outbound connection pooling must be explicit:

```logicn
outbound service PaymentProvider {
  protocol: https

  connectionPool {
    keepAlive: true
    maxSockets: 50
    maxFreeSockets: 10
    idleTimeoutMs: 10000
  }

  timeoutMs: 30000
  retry: safeOnly
}
```

Keep-alive and pooling must never bypass TLS policy, authentication,
authorization, validation, timeout policy, rate limits, body limits,
backpressure, secret-safe logging or audit requirements.

## Reports

This package should define the facts needed for:

```text
app.network-report.json
app.tls-report.json
app.secret-flow-report.json
app.package-network-report.json
app.port-report.json
app.rate-limit-report.json
app.firewall-report.json
app.packet-filter-report.json
app.network-performance-report.json
```

Example:

```json
{
  "network": {
    "plaintextAllowed": false,
    "inboundPorts": [8080],
    "outboundHosts": ["api.company.com"],
    "tlsRequired": true,
    "minimumTlsVersion": "TLS1.3",
    "certificateValidation": "required",
    "secretsInUrls": "denied",
    "rawSockets": "denied",
    "zeroCopy": "available",
    "ioBackend": "io_uring",
    "rateLimits": [
      {
        "route": "POST /login",
        "limit": "5/minute/ip"
      }
    ],
    "warnings": []
  }
}
```

Final rule:

```text
logicn-core-network defines network contracts.
logicn-core-security decides permissions.
logicn-framework-app-kernel enforces app policy.
logicn-framework-api-server serves HTTP.
logicn-tools-benchmark measures network behavior.
```
