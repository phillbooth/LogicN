# LogicN — Value-State Annotations

## Status

```
v1 feature
Phase 5 prerequisite
```

---

## Purpose

Value-state annotations let LogicN attach **trust, safety, validation, and
provenance state** to individual values at the binding site.

They are distinct from flow qualifiers.

| Concept | Syntax example | What it describes |
|---|---|---|
| Flow qualifier | `secure flow`, `pure flow` | The execution kind of a flow |
| Value-state annotation | `String unsafe unvalidated` | The trust state of a value |

A flow can be `secure` (security-sensitive execution) while still receiving
`unsafe unvalidated` values from an external API body. These are orthogonal
properties.

```logicn
secure flow createCustomer(req: Request) -> Result<Response, ApiError>
effects [database.write] {
  let body: Json unsafe unvalidated = boundary.api.body(req)
  let input: CreateCustomerInput safe validated = validate.customer(body)?
  ...
}
```

The flow is `secure`. The value `body` is `unsafe unvalidated`. The value
`input` is `safe validated`. All three are correct and different statements.

---

## Core Idea

A value-state annotation describes **what condition a value is currently in**.

```logicn
let rawEmail:  String  unsafe unvalidated = form.email
let email:     Email   safe   validated   = validate.email(rawEmail)?
```

The compiler uses these annotations to enforce that unvalidated data cannot
reach governed sinks (databases, networks, payment processors) without passing
through an approved gate first.

---

## v1 State Vocabulary

For v1, the supported states are deliberately minimal.

### Safety dimension

| State | Meaning |
|---|---|
| `safe` | Value is allowed inside normal governed logic |
| `unsafe` | Value came from an untrusted or unchecked boundary |

### Validation dimension

| State | Meaning |
|---|---|
| `validated` | Value has passed an explicit validation gate |
| `unvalidated` | Value has not passed a validation gate |

### Provenance dimension

| State | Meaning |
|---|---|
| `tainted` | Value came from a source requiring sanitisation |

### Secret dimension

| State | Meaning |
|---|---|
| `secret` | Value contains sensitive material |
| `protected` | Value has restricted operations (printing, comparison, serialisation) |

### Access dimension

| State | Meaning |
|---|---|
| `readonly` | Cannot be mutated through this binding |

These states are composable in pairs:

```logicn
String unsafe unvalidated
Email safe validated
SecureString secret protected
Json tainted external     // external is a Phase 6+ provenance state
```

> Note: `trusted`, `untrusted`, `internal`, `external`, `redacted`, `owned`,
> `borrowed`, `shared` are in the design vocabulary but are deferred to Phase 6+.
> Do not add them to the Phase 5 checker.

---

## Syntax

### EBNF

```ebnf
binding_decl =
  binding_keyword identifier ":" type_ref [ value_state_list ] "=" expression ;

binding_keyword =
  "let" | "mut" | "readonly" ;

value_state_list =
  value_state { value_state } ;

value_state =
  "safe"
  | "unsafe"
  | "validated"
  | "unvalidated"
  | "tainted"
  | "secret"
  | "protected"
  | "readonly" ;
```

Value-state tokens appear **after the type reference** and **before the `=`**.

### Examples

```logicn
let rawEmail: String unsafe unvalidated = form.email
let email: Email safe validated = validate.email(rawEmail)?
let token: SecureString secret protected = env.secret("API_TOKEN")
mut retryCount: Int safe = 0
readonly config: AppConfig safe = loadConfig()
```

Value-state annotations are **optional**. A binding without them carries no
annotated state (the checker does not infer states for unannotated bindings
in Phase 5).

---

## AST Shape

The Phase 4 parser encodes value states as suffix strings on the `typeRef`
node value (e.g. `"String unsafe unvalidated"`). Phase 5 must split this into
structured fields.

### Updated binding node shape

```typescript
export type ValueState =
  | "safe"
  | "unsafe"
  | "validated"
  | "unvalidated"
  | "tainted"
  | "secret"
  | "protected"
  | "readonly";

export interface BindingNode extends AstNode {
  readonly kind: "letDecl" | "mutDecl" | "readonlyDecl";
  /** Binding name */
  readonly value: string;
  /** Base type without state annotation */
  readonly typeAnnotation?: string;
  /** Structured value states parsed from the annotation */
  readonly valueStates?: readonly ValueState[];
  readonly location?: SourceLocation;
  readonly children?: readonly AstNode[];
}
```

### Example AST

Source:

```logicn
let rawEmail: String unsafe unvalidated = form.email
```

AST:

```json
{
  "kind": "letDecl",
  "value": "rawEmail",
  "typeAnnotation": "String",
  "valueStates": ["unsafe", "unvalidated"],
  "location": { "file": "forms.lln", "line": 3, "column": 3 }
}
```

---

## Semantic Checker Rules

These rules are enforced by the value-state checker pass (Phase 5).

### Rule 1 — Unsafe values cannot reach governed sinks

Values annotated `unsafe` or `unvalidated` must not flow into:

```
database.write
database.insert
network.outbound
shell.exec
filesystem.write
secret.write
payment.charge
```

unless they have passed a named gate that upgrades their state first.

Diagnostic: `LLN-VALUESTATE-001`

### Rule 2 — State upgrades require an approved gate

A value cannot be directly assigned from `unsafe unvalidated` to `safe validated`
without passing through a named gate function.

Invalid:

```logicn
let rawEmail: String unsafe unvalidated = input.email
let email: Email safe validated = rawEmail   // no gate — error
```

Valid:

```logicn
let rawEmail: String unsafe unvalidated = input.email
let email: Email safe validated = validate.email(rawEmail)?  // gate present
```

Diagnostic: `LLN-VALUESTATE-002`

### Rule 3 — Secret protected values have restricted operations

Values annotated `secret protected` cannot be:

- Passed to `print()`, `log.*()`, or any logging function
- Compared with `==` (use `constantTimeEquals()`)
- Included in an API response body
- Stored in a plain `String` binding

Diagnostic: `LLN-SECRET-001` (print/log), `LLN-SECRET-002` (equality comparison),
`LLN-SECRET-003` (API response)

### Rule 4 — Tainted values require sanitisation

Values annotated `tainted` must pass through a `sanitize.*` function before
they can be treated as `safe validated`.

Diagnostic: `LLN-VALUESTATE-004`

### Rule 5 — No implicit state contradiction

A type annotation must not declare a state that contradicts the value's source.
Values arriving from `boundary.api.*` or `env.*` are presumed
`unsafe unvalidated` by default and must be annotated accordingly.

Diagnostic: `LLN-VALUESTATE-005`

---

## Gate Functions

State upgrades from `unsafe → safe` always require a named gate.

### Recognised gate prefixes (Phase 5)

| Pattern | Upgrades from | Upgrades to |
|---|---|---|
| `validate.*` | `unsafe unvalidated` | `safe validated` |
| `sanitize.*` | `unsafe unvalidated` / `tainted` | `safe validated` |
| `redact()` | `secret protected` | (redacted state — Phase 6+) |
| `constantTimeEquals()` | `secret protected` | — (allowed comparison) |
| `decode.typedJson()` | `Json unsafe unvalidated` | `safe validated` |

Gate recognition in Phase 5 is pattern-based on call expression names. A
full type-system gate registry is a Phase 6+ addition.

---

## Diagnostic Codes

All codes follow the `LLN-SERIES-NNN` format.

### LLN-VALUESTATE series

| Code | Name | Severity | Description |
|---|---|---|---|
| `LLN-VALUESTATE-001` | `UNSAFE_VALUE_AT_SINK` | error | `unsafe` or `unvalidated` value reached a governed sink |
| `LLN-VALUESTATE-002` | `IMPLICIT_STATE_UPGRADE` | error | Cannot assign `unsafe unvalidated` to `safe validated` without a gate |
| `LLN-VALUESTATE-003` | `MISSING_VALIDATION_GATE` | error | A validation gate is required but not present |
| `LLN-VALUESTATE-004` | `TAINTED_VALUE_UNSANITISED` | error | `tainted` value used without a sanitiser |
| `LLN-VALUESTATE-005` | `STATE_ANNOTATION_CONFLICT` | error | Value-state annotation conflicts with inferred source state |

### LLN-SECRET series

| Code | Name | Severity | Description |
|---|---|---|---|
| `LLN-SECRET-001` | `SECRET_LOGGED_RAW` | error | `secret protected` value passed to a print or log function |
| `LLN-SECRET-002` | `SECRET_EQUALITY_COMPARISON` | error | `secret protected` value compared with `==` (use `constantTimeEquals()`) |
| `LLN-SECRET-003` | `SECRET_IN_API_RESPONSE` | error | `secret protected` value included in an API response |

### Diagnostic shape

```typescript
{
  code: "LLN-VALUESTATE-001",
  name: "UNSAFE_VALUE_AT_SINK",
  severity: "error",
  message: "Unsafe unvalidated value 'rawMessage' cannot flow into database.write.",
  location: { file: "forms.lln", line: 14, column: 7 },
  suggestedFix: "Pass rawMessage through validate.* or sanitize.* before writing to the database."
}
```

---

## Examples

### API boundary — correct pattern

```logicn
secure flow createCustomer(req: Request) -> Result<Response, ApiError>
effects [database.write, audit.write] {
  let body: Json unsafe unvalidated = boundary.api.body(req)

  match validate.customer(body) {
    Ok(customerInput) => {
      let customer: CreateCustomerInput safe validated = customerInput
      let saved: Customer = saveCustomer(customer)?
      return Ok(Api.created(saved))
    }
    Err(ValidationError) => {
      return Ok(Api.badRequest("Invalid customer input"))
    }
  }
}
```

### API boundary — error (unsafe value reaches database)

```logicn
secure flow unsafeSave(req: ContactFormRequest) -> Result<ContactForm, FormError>
effects [database.write] {
  let rawMessage: String unsafe unvalidated = req.message

  // LLN-VALUESTATE-001: unsafe unvalidated value cannot flow into database.write
  let saved: ContactForm = ContactFormsDB.insert({ message: rawMessage })?

  return Ok(saved)
}
```

### Secret — correct pattern

```logicn
secure flow loadApiKey() -> Result<SecureString, SecretError>
effects [secret.read] {
  let apiKey: SecureString secret protected = env.secret("API_KEY")

  // LLN-SECRET-001 would fire here — do NOT uncomment:
  // print(apiKey)

  log.info("API key loaded", { key: redact(apiKey) })

  return Ok(apiKey)
}
```

### Constant-time comparison — correct pattern

```logicn
secure flow verifyToken(provided: SecureString secret protected) -> Result<Decision, AuthError>
effects [secret.read, audit.write] {
  let expected: SecureString secret protected = env.secret("EXPECTED_TOKEN")

  // LLN-SECRET-002 would fire here — do NOT uncomment:
  // if provided == expected { ... }

  let valid: Bool = provided.constantTimeEquals(expected)

  match valid {
    true  => return Ok(Allow)
    false => return Ok(Deny)
  }
}
```

---

## Relationship to Flow Qualifiers

| Concept | Controls | Example |
|---|---|---|
| `pure flow` | Whether effects are declared | `pure flow add(a: Int) -> Int` |
| `secure flow` | Whether effects are audited and declared | `secure flow save(...) effects [...]` |
| `safe` / `unsafe` | Whether a **value** passed a validation gate | `let raw: String unsafe unvalidated` |

`safe flow` is **not valid syntax** in v1. Do not invent it.

---

## Relationship to the Effect Checker

The value-state checker and the effect checker are separate passes.

- The **effect checker** (`LLN-EFFECT-*`) validates that declared effects match
  flow qualifiers (e.g. `pure flow` must declare no effects).
- The **value-state checker** (`LLN-VALUESTATE-*`, `LLN-SECRET-*`) validates
  that annotated values do not reach sinks incompatible with their state.

A future joint pass may correlate effect sinks with value states (e.g.
`database.write` requires `safe validated` inputs), but that is a Phase 6+
concern.

---

## Future Extensions (Phase 6+)

The full design vocabulary includes states that are deferred:

```
trusted / untrusted — trust dimension
internal / external — provenance dimension
redacted            — output of redact()
owned / borrowed / shared — ownership/access
```

The `@state(Confirmed)` lifecycle annotation syntax and `state OrderState { ... }`
declarations are also deferred. See the future design specification in
`NOTES TO COVER/z` and `NOTES TO COVER/logicn_value_state_annotation_design.md`.

---

## Tokenisation

Value-state words are **active keywords** in v1 (already in `V1_ACTIVE_KEYWORDS`
in the Phase 4 lexer). They are contextual in semantics — they are only
meaningful after a type reference in a binding declaration — but they are
classified as `keyword` tokens, not `identifier`, to prevent their use as
variable names.

See: `docs/Knowledge-Bases/v1-reserved-keywords.md`

---

## See Also

- `docs/Knowledge-Bases/effect-checker-and-boundary-checker.md`
- `docs/Knowledge-Bases/logicn-core-effect-checker-v02.md`
- `docs/Knowledge-Bases/formal-type-system-spec.md`
- `packages-logicn/logicn-core-compiler/src/parser.ts` — `parseTypeRefWithValueState()`
