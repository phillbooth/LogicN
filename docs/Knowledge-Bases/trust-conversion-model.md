# Trust Conversion Model

## Definition

LogicN converts `unsafe` data into `safe` data through approved trust gates.
The vocabulary is kept deliberately small: three operations cover the full
trust conversion pipeline.

```text
validate  = prove the value is acceptable (shape, type, range)
clean     = remove or normalise dangerous content
encode    = make safe for a specific output context
```

## Why Three Operations

Security terminology in the industry is broad: escaping, filtering,
sanitization, output encoding, input validation, etc. LogicN documents those
as industry terms but exposes a small, clear vocabulary in the language.

`sanitize` is used in documentation as the umbrella term. LogicN syntax uses
`validate`, `clean` and `encode`.

## The Trust Gate Pipeline

```text
unsafe input
  -> validate.*  // checks acceptable shape/value
  -> clean.*     // removes or normalises unwanted content
  -> encode.*    // makes safe for a specific output boundary
  -> safe context type
```

## validate.*

Proves the value is acceptable in shape, type or range. Returns a typed safe
value:

```logicn
let email: safe Email = validate.email(raw_email)
let id: safe Id = validate.id(raw_id)
let price: safe Decimal = validate.decimal(raw_price)
```

## clean.*

Removes or normalises dangerous content:

```logicn
let name: safe String = clean.text(raw_name)
```

## encode.*

Makes data safe for a specific output boundary:

```logicn
let html_comment: safe Html = encode.html(raw_comment)
let url_part: safe UrlPart = encode.url(raw_part)
let shell_arg: safe ShellArg = encode.shell_arg(raw_arg)
```

Context matters — SQL, HTML, URLs, JavaScript, XML and shell each require
different treatment. Do not mix output encodings.

## SQL: Parameterized Queries

For database access, prefer parameterized queries rather than manual SQL
escaping. The runtime handles the encoding:

```logicn
flow get_user(raw_id: unsafe String) -> User
  uses database.main.read
{
  let id: safe Id = validate.id(raw_id)

  let q: Query = sql {
    SELECT id, email
    FROM users
    WHERE id = :id
  }

  let raw_user: unsafe Any = database.main.run(q, { id: id })
  let user: safe User = validate.user(raw_user)
  return user
}
```

Database responses are also `unsafe` until validated.

## Trust Gate Summary

```logicn
validate.email(raw)     -> safe Email
validate.decimal(raw)   -> safe Decimal
clean.text(raw)         -> safe String
encode.html(raw)        -> safe Html
encode.url(raw)         -> safe UrlPart
encode.shell_arg(raw)   -> safe ShellArg
```

## Comparison with Rust

Rust's `unsafe` marks code that crosses a memory safety boundary.
LogicN's `unsafe` marks data that crosses a trust boundary.

Rust keeps unsafe code behind explicit `unsafe` blocks.
LogicN keeps unsafe data behind `validate`, `clean` and `encode` gates.

## Core Principle

```text
LogicN does not trust external data.
LogicN converts unsafe data into safe data
through approved trust gates: validate, clean, and encode.
```
