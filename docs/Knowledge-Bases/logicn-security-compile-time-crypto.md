# LogicN Security — Compile-Time Cryptographic Parameters

## Overview

For flows that cross security boundaries, cryptographic algorithm choices,
cipher suites, protocol versions and key-size minimums must be **compile-time
constants**, not runtime configuration strings.

A tampered config file must not be able to downgrade encryption.

---

## The Risk

If crypto decisions are runtime strings, these downgrades become possible through
misconfiguration, injection or deployment error:

```text
AES-256-GCM   → AES-128-CBC
TLS 1.3       → TLS 1.0
Ed25519       → RSA-1024
Argon2id      → MD5
cert verify   → disabled
encryption    → optional
```

---

## Security Boundary Definition

The rule applies when a flow crosses any of these boundaries:

```text
network.external
webhook signature verification
payment processing
auth/session/token handling
password hashing
database encryption
secret storage
HSM/KMS operations
native interop
cross-service RPC
public API request/response
```

---

## The Rule

Security-boundary flows must use compile-time-known sealed crypto policy values.

Invalid:

```logicn
secure flow sendPayment(payload: PaymentPayload) -> Result<Response, NetworkError>
effects [network.external] {
  let cipher = config.crypto.cipher  // runtime string — rejected
  return tls.send(payload, cipher: cipher)
}
```

Valid:

```logicn
const PaymentTlsPolicy: TlsPolicy = TlsPolicy.v1_3 {
  cipher_suites [TLS_AES_256_GCM_SHA384]
  min_key_bits 256
  cert_verify required
}

secure flow sendPayment(payload: PaymentPayload) -> Result<Response, NetworkError>
effects [network.external] {
  return tls.send(payload, policy: PaymentTlsPolicy)
}
```

---

## What Must Be Compile-Time

For security-boundary flows:

```text
algorithm family
cipher suite allowlist
minimum protocol version
key size minimums
signature algorithm
hash/KDF algorithm
AEAD mode
certificate verification requirement
HMAC requirement
randomness source class
password hashing policy
token signing algorithm
fallback behaviour (must fail closed)
```

## What Can Remain Runtime-Configurable

These may be runtime values if typed and validated:

```text
key identifier or HSM/KMS reference
certificate path or provider reference
remote hostname
port
timeout
rate limit
rotation schedule
environment-specific provider
local/dev mock provider
```

---

## Sealed Policy Types

Avoid raw strings:

```logicn
// Bad
encrypt(data, algorithm: "AES-256-GCM")

// Good
encrypt(data, policy: CryptoPolicy.Aes256Gcm)

// Best for governed flows
const PaymentCrypto: EncryptionPolicy = EncryptionPolicy.Aes256Gcm {
  nonce random_secure
  tag_bits 128
  key_source hsm "PAYMENT_DATA_KEY"
}
```

---

## Example Policy Declarations

```logicn
const WebhookHmac: HmacPolicy = HmacPolicy.sha256 {
  min_key_bits 256
}

const PasswordHashing: PasswordPolicy = Argon2id {
  memory 64mb
  iterations 3
  parallelism 2
}

const ApiTls: TlsPolicy = TlsPolicy.v1_3 {
  cipher_suites [TLS_AES_256_GCM_SHA384]
  cert_verify required
}

const SigningPolicy: SignaturePolicy = Ed25519 { }
```

---

## Diagnostics

| Code | Meaning |
|---|---|
| `LLN-CRYPTO-001` | Algorithm must be compile-time known across security boundary |
| `LLN-CRYPTO-002` | Runtime string used as cryptographic policy |
| `LLN-CRYPTO-003` | Algorithm not in approved policy set |
| `LLN-CRYPTO-004` | Key size below minimum for production profile |
| `LLN-CRYPTO-005` | Protocol downgrade forbidden |
| `LLN-CRYPTO-006` | Certificate verification cannot be disabled in production |
| `LLN-CRYPTO-007` | Crypto fallback must fail closed |
| `LLN-CRYPTO-008` | Unapproved custom crypto primitive |

Example:

```text
LLN-CRYPTO-001: cryptographic algorithm must be compile-time known

Flow: sendPayment
Boundary: network.external
Found: config.crypto.cipher

Runtime configuration can be tampered with or misconfigured and must not
select algorithms for security-boundary flows.

Suggestion:
  Define a `const TlsPolicy` or use an approved sealed crypto policy.
```

---

## Security Report Fields

```text
flow name
security boundary crossed
crypto policy name
algorithm family
protocol version
cipher suite allowlist
key size minimum
key source class
certificate verification mode
fallback behaviour
production profile result
source location
```

---

## Policy Update Workflow

Compile-time constants do not mean hardcoded forever. The intended update path is:

1. Edit crypto policy source
2. Review the source diff
3. Run crypto policy check
4. Update build report
5. Deploy new artefact

Crypto posture changes produce a source diff and a build artefact diff — this is
deliberate. Changing the effective encryption strength must require a code review
and deployment, not a config file edit.

---

## Architecture Placement

| Layer | Responsibility |
|---|---|
| `logicn-core` | `const` evaluation rules, sealed policy types, diagnostics |
| `logicn-core-compiler` | Security-boundary analysis, rejection of runtime algorithm selection |
| `logicn-core-security` | Crypto policy types, approved algorithm registry, secret/key rules |
| `logicn-core-config` | Typed runtime config values that cannot weaken crypto policy |
| `logicn-core-runtime` | Runtime enforcement that provider matches compiled policy |
| `logicn-core-reports` | Crypto posture in security reports |
| `logicn-core-network` | TLS policy and network-boundary enforcement |
