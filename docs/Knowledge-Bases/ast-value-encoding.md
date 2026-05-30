# LogicN — AST `.value` Field Encoding

## Status

```
Phase 7 reference doc
Verified against: packages-logicn/logicn-core-compiler/src/parser.ts
```

## Purpose

Every `AstNode` has an optional `.value: string` field. Its meaning is entirely
determined by `.kind`. This document specifies exactly what `.value` contains
for every `AstNodeKind`, enabling AI tools, checkers, and consumers to parse
the AST reliably without reverse-engineering the parser.

---

## Rules at a Glance

- `.value` is `undefined` for structural nodes (`block`, `returnStmt`, `ifStmt`, `matchExpr`, `program`)
- `letDecl` / `mutDecl` encode safety prefix + name + type all in one string
- `callExpr` stores only the method/function name — the receiver is `children[0]` for method calls
- `matchArm` stores only the first pattern token — binding variables inside `Some(x)` are **not** captured
- `typeRef` stores the complete type string including generics, e.g. `"Result<String, Error>"`
- `effectsDecl.value` is a comma-joined summary; the authoritative list is in `children` (effectRef nodes)

---

## Node-by-Node Reference

### `program`
```
.value   → undefined
.children → all top-level declarations
```

---

### `importDecl`
```
.value   → the full import path as a single string
           e.g. "std.text"  or  "orders from ./orders.lln"
.children → undefined
```

---

### `typeDecl`
```
.value   → the declared type name
           e.g. "User"  "Order"  "CustomerId"
.children → undefined  (body is skipped — type fields not yet parsed into AST)
```

---

### `enumDecl`
```
.value    → the declared enum name
            e.g. "Status"  "OrderState"
.children → identifier nodes, one per variant
            { kind: "identifier", value: "Active" }
            { kind: "identifier", value: "Suspended" }

Note: Phase 7A parser fix — variants were discarded before Phase 7A.
      Parsers from Phase 6 or earlier produce no children.
```

---

### `intentDecl`
```
.value   → "intent <name>"  (keyword + name joined with a space)
           e.g. "intent createOrder"
.children → undefined  (body skipped by parseGenericBlock)
```

---

### `governanceDecl`
```
.value   → "governance <name>"
           e.g. "governance paymentPolicy"
.children → undefined  (body skipped)
```

---

### `apiDecl`
```
.value   → "api <name>"
           e.g. "api OrdersApi"
.children → undefined  (body skipped)
```

---

### `flowDecl` / `secureFlowDecl` / `pureFlowDecl`
```
.value   → the flow name (identifier only, no qualifier)
           e.g. "createCustomer"  "processPayment"

.children → [
    ...paramDecl nodes (one per parameter),
    typeRef node  (return type),
    effectsDecl node  (optional, present only if `effects [...]` declared),
    block node  (function body)
]
```
The qualifier (`flow` / `secure` / `pure`) is encoded in `.kind`, not `.value`.

---

### `paramDecl`
```
.value   → "name: TypeString"
           e.g. "request: Request"
                "email: String"
                "amount: Money<GBP>"

.children → undefined
```
The type string is verbatim from source — may include generics.

---

### `typeRef`
```
.value   → the complete type string including generic arguments
           e.g. "String"
                "Option<String>"
                "Result<User, ValidationError>"
                "Map<String, Array<Int>>"
                "String unsafe"   (postfix qualifier preserved)

.children → undefined
```
The value may include postfix state qualifiers like `unsafe` or `secure` appended
after a space. The type-checker's `parseTypeString()` strips these.

---

### `effectsDecl`
```
.value   → comma-joined summary of effect names (for display only)
           e.g. "database.write, audit.write"

.children → effectRef nodes, one per effect
            { kind: "effectRef", value: "database.write" }
            { kind: "effectRef", value: "audit.write" }
```
**Always use `children` for programmatic effect access**, not `.value`.

---

### `effectRef`
```
.value   → the dot-separated effect name
           e.g. "database.read"
                "audit.write"
                "secret.read"
                "network.outbound"

.children → undefined
```

---

### `block`
```
.value   → undefined
.children → statement/expression nodes in source order
```

---

### `letDecl`
```
.value   → "[safetyPrefix ][name][: TypeString]"

Forms:
  "rawEmail: String"           no prefix, with type
  "counter: Int"               no prefix, with type
  "x"                          no prefix, no type annotation
  "unsafe rawEmail: String"    unsafe prefix
  "safe rawEmail: String"      safe prefix
  "unsafe body: Bytes"         unsafe prefix with binary type

.children → [ init expression node ]
```
Parser: `value = safetyPrefix ? "${safetyPrefix} ${name}: ${type}" : "${name}: ${type}"`

---

### `mutDecl`
```
.value   → same format as letDecl
           "[safetyPrefix ][name][: TypeString]"

Forms:
  "counter: Int"
  "safe rawEmail: String"      safe upgrade (RHS will be a gate expression)
  "unsafe rawInput: Bytes"

.children → [ init expression node ]
```

---

### `readonlyDecl`
```
.value   → "name: TypeString"
           (same format as letDecl without safety prefix)

.children → [ init expression node ]

Note: readonlyDecl is declared in AstNodeKind but not yet fully implemented
      in the Phase 6/7 parser. Treat as structurally identical to letDecl.
```

---

### `returnStmt`
```
.value   → undefined
.children → [ return expression ]   (empty for bare `return`)
```

---

### `ifStmt`
```
.value   → undefined
.children → [
    condition expression,
    then block,
    else block  (optional — only present if `else { ... }` exists)
]
```

---

### `matchExpr`
```
.value   → undefined
.children → [
    subject expression,  (the value being matched)
    ...matchArm nodes
]
```

---

### `matchArm`
```
.value   → the first token of the pattern only

Examples:
  "None"          None arm
  "Some"          Some(x) arm  — binding variable NOT captured
  "Ok"            Ok(x) arm   — binding variable NOT captured
  "Err"           Err(e) arm  — binding variable NOT captured
  "Active"        enum variant arm
  "_"             wildcard arm

.children → [ body expression or block ]

⚠️  LIMITATION: Pattern binding variables are discarded.
    `Some(user) =>` stores ".value = 'Some'" — `user` is not in the AST.
    Phase 7B exhaustiveness checking uses the pattern names only.
```

---

### `callExpr`

**Method call** (e.g. `DB.insert(record)`, `validate.email(raw)`):
```
.value   → the method name (rightmost segment only)
           e.g. "insert"  "email"  "write"

.children → [
    receiver node  (identifier or memberExpr),
    ...argument nodes
]
```

**Standalone call** (e.g. `print(msg)`, `redact(secret)`):
```
.value   → the function name
           e.g. "print"  "redact"  "constantTimeEquals"

.children → [ ...argument nodes ]  (no receiver node)
```

To reconstruct the full call name, combine receiver and method:
```typescript
// From value-state-checker.ts buildFullCallName():
const receiver = node.children?.[0];
const receiverName = getNodeName(receiver);   // "DB" or "validate"
const fullName = receiverName ? `${receiverName}.${node.value}` : node.value;
// → "DB.insert"  or  "validate.email"  or  "print"
```

---

### `memberExpr`
```
.value   → the accessed member name (rightmost segment)
           e.g. "email"  "rawBody"  "id"

.children → [ receiver node ]
           e.g. identifier "user"  for  user.email
                memberExpr  for  user.profile.email  (nested)
```
Member chains nest: `user.profile.email` →
```
memberExpr("email") {
  memberExpr("profile") {
    identifier("user")
  }
}
```

---

### `binaryExpr`
```
.value   → the operator token string
           "+", "-", "*", "/", "%",
           "==", "!=", "<", "<=", ">", ">=",
           "&&", "||"

.children → [ left operand, right operand ]
```

---

### `unaryExpr`
```
.value   → the unary operator token string
           "!"  or  "-"

.children → [ operand ]
```

---

### `identifier`
```
.value   → the identifier name as written in source
           e.g. "user"  "rawEmail"  "status"  "DB"

.children → undefined
```

---

### `stringLiteral`
```
.value   → the string content without surrounding quotes
           e.g.  source "hello"  →  .value = "hello"
                 source ""       →  .value = ""

.children → undefined
```

---

### `numberLiteral`
```
.value   → the numeric literal as a string (verbatim from source)
           e.g.  source 42      →  .value = "42"
                 source 3.14    →  .value = "3.14"
                 source 0xFF    →  .value = "0xFF"

.children → undefined
```

---

### `boolLiteral`
```
.value   → "true"  or  "false"

.children → undefined
```

---

### `errorPropagation`
```
.value   → undefined

.children → [ the expression being propagated ]
            e.g. callExpr("email") node  for  validate.email(raw)?
```
`?` wraps the inner expression. The inner expression is always `children[0]`.

---

### `computeTargetBlock`
```
.value   → the target kind string
           "cpu"  "gpu"  "npu"  "best"

.children → [ block node ]
```
The target kind is always one of those four identifiers in v1.

---

## Parsing the `letDecl` / `mutDecl` Value

Both checkers need to extract `safetyPrefix`, `name`, and `typeName` from the
single `.value` string. The canonical parser is in `value-state-checker.ts`:

```typescript
function parseBindingValue(value: string): BindingInfo {
  let rest = value.trim();
  let safetyPrefix: "unsafe" | "safe" | undefined;

  if (rest.startsWith("unsafe ")) {
    safetyPrefix = "unsafe";
    rest = rest.slice("unsafe ".length).trim();
  } else if (rest.startsWith("safe ")) {
    safetyPrefix = "safe";
    rest = rest.slice("safe ".length).trim();
  }

  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) {
    return { safetyPrefix, name: rest.trim(), typeName: "" };
  }

  const name = rest.slice(0, colonIdx).trim();
  const typeSection = rest.slice(colonIdx + 1).trim();
  const baseName = typeSection.split(/[<\s]/)[0] ?? typeSection;
  return { safetyPrefix, name, typeName: baseName };
}
```

---

## Reconstructing Full Call Names

For governed-sink detection and gate recognition, reconstruct the full dotted
call name by walking the receiver chain:

```typescript
function getNodeName(node: AstNode): string {
  if (node.kind === "identifier") return node.value ?? "";
  if (node.kind === "memberExpr") {
    const parent = node.children?.[0];
    const parentName = parent !== undefined ? getNodeName(parent) : "";
    const memberName = node.value ?? "";
    return parentName !== "" ? `${parentName}.${memberName}` : memberName;
  }
  return "";
}
```

---

## See Also

- `packages-logicn/logicn-core-compiler/src/parser.ts` — canonical implementation
- `packages-logicn/logicn-core-compiler/src/value-state-checker.ts` — `parseBindingValue()`, `buildFullCallName()`
- `packages-logicn/logicn-core-compiler/src/type-checker.ts` — `checkBindingTypeAnnotation()`
- `docs/Knowledge-Bases/stdlib-gates.yaml` — gate and sink name patterns
