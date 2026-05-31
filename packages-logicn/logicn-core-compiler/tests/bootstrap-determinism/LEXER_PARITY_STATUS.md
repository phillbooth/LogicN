# Stage B Lexer Parity Status

**Source under test:** `flow greet(name: String) -> String { return name }`
**Date assessed:** 2026-05-31
**PARITY_ACHIEVED flag:** `false`

---

## 1. TypeScript Lexer Output

Running `lex(source, "test.lln")` on the source above produces **13 significant tokens**
(i.e. excluding the trailing `eof`):

| idx | kind       | value    |
|-----|------------|----------|
| 0   | keyword    | flow     |
| 1   | identifier | greet    |
| 2   | symbol     | (        |
| 3   | identifier | name     |
| 4   | symbol     | :        |
| 5   | identifier | String   |
| 6   | symbol     | )        |
| 7   | **operator** | **->** |
| 8   | identifier | String   |
| 9   | symbol     | {        |
| 10  | keyword    | return   |
| 11  | identifier | name     |
| 12  | symbol     | }        |
| 13  | eof        | (empty)  |

Total with eof: **14 tokens** (13 significant + 1 eof).

Key observations:
- Kind names are **lowercase** (`keyword`, `identifier`, `symbol`, `operator`, `eof`).
- Multi-character operators such as `->`, `=>`, `==`, `!=`, `<=`, `>=`, `&&`, `||`
  are emitted as a **single `operator` token**.
- Number literals use kind `number` (not `NumberLiteral`).
- String literals use kind `string`; char literals use kind `char`.

---

## 2. lexer.lln Current Output

Running `tokenize(source)` via the interpreter on the same source produces
**14 significant tokens** (i.e. excluding the trailing `Eof`):

| idx | kind       | value    |
|-----|------------|----------|
| 0   | Keyword    | flow     |
| 1   | Identifier | greet    |
| 2   | Symbol     | (        |
| 3   | Identifier | name     |
| 4   | Symbol     | :        |
| 5   | Identifier | String   |
| 6   | Symbol     | )        |
| 7   | **Symbol** | **-**    |
| 8   | **Symbol** | **>**    |
| 9   | Identifier | String   |
| 10  | Symbol     | {        |
| 11  | Keyword    | return   |
| 12  | Identifier | name     |
| 13  | Symbol     | }        |
| 14  | Eof        | (empty)  |

Total with Eof: **15 tokens** (14 significant + 1 Eof).

Status:
- lexer.lln **parses with zero errors**.
- lexer.lln **executes without runtime errors**.
- Output is an `Ok(Array<Token>)` as specified.

---

## 3. Gap Analysis

### Gap 1 — Multi-character operator splicing (BLOCKING)

**Severity:** High — causes token-count divergence.

The TS lexer reads ahead to detect multi-character operator sequences such as
`->`, `=>`, `==`, `!=`, `<=`, `>=`, `&&`, `||`, `//`, `/*`, etc., and emits
them as a single `operator` token.

`lexer.lln` currently falls through to the catch-all `else` branch which emits
every non-alphanumeric, non-whitespace character as a single `Symbol` token.
Therefore `->` becomes `Symbol("-") + Symbol(">")`.

**Fix needed:** Add a `scanOperator(source, pos, srcLen)` helper flow that
peeks ahead for known two-character sequences and returns the combined string.
The `else` branch in `tokenize` should call `scanOperator` and emit with kind
`Operator` when a multi-char sequence is found, otherwise fall back to
single-char `Symbol`.

Operators to handle (at minimum for parity):
`->`, `=>`, `==`, `!=`, `<=`, `>=`, `&&`, `||`, `..`, `::`, `//`, `/*`

### Gap 2 — Kind name casing (COSMETIC)

**Severity:** Low — easily normalised by the test harness.

The TS lexer uses lowercase kind names (`keyword`, `identifier`, `symbol`,
`operator`, `number`, `string`, `char`, `newline`, `eof`), while `lexer.lln`
uses PascalCase (`Keyword`, `Identifier`, `Symbol`, `Operator`, `NumberLiteral`,
`StringLiteral`, `CharLiteral`, `Newline`, `Eof`).

The parity test normalises TS kinds to PascalCase via `tsPascalKind()` before
comparison so this does not block parity.  However the canonical internal
representation should be agreed upon; the self-hosted compiler will ultimately
define its own IR so the PascalCase convention in `lexer.lln` is acceptable.

### Gap 3 — String literals (NOT YET TESTED)

**Severity:** Medium — `lexer.lln` has no string-scanning branch.

The `else` catch-all in `tokenize` would emit `Symbol('"')` for the opening
quote rather than scanning a full `StringLiteral`.  A `scanString()` helper
is needed.

### Gap 4 — Char literals (NOT YET TESTED)

**Severity:** Medium — similar to Gap 3.

The single-quote character `'` would fall through to `Symbol("'")`.  A
`scanCharLiteral()` helper is needed.

### Gap 5 — Comment stripping (NOT YET TESTED)

**Severity:** Low for basic parity, medium for full bootstrap.

The TS lexer strips `//` line comments and `/* */` block comments.  `lexer.lln`
would currently emit the `/` characters as `Symbol` tokens.

### Gap 6 — Underscore in identifiers (NOT YET TESTED)

**Severity:** Low.

The TS lexer allows `_` in identifiers (e.g. `my_var`).  `lexer.lln`'s
`scanWord` only advances on `isLetter() or isDigit()`, so an underscore would
terminate an identifier early.

---

## 4. What Must Change for Full Parity

1. **Add `scanOperator()` helper** — reads up to 2 chars, checks against the
   known operator set, returns `[operatorString, endPos]`.  Emit `Operator`
   kind tokens for matches, `Symbol` for single characters.

2. **Add `scanString()` helper** — reads from `"` to closing `"` handling `\"`
   and other escape sequences.  Emit `StringLiteral`.

3. **Add `scanCharLiteral()` helper** — reads `'X'` or `'\n'` etc.  Emit
   `CharLiteral`.

4. **Add comment scanning** — detect `//` and skip to end of line; detect
   `/*` and skip to `*/`.

5. **Allow `_` in identifiers** — update `scanWord` condition to include
   `nc.isUnderscore()` (or inline the check as `nc == '_'`).

6. **Flip `PARITY_ACHIEVED = true`** in `lexer-parity.test.mjs` once all the
   above are implemented and the test suite passes cleanly.

---

## 5. What Works Well

- `lexer.lln` successfully parses and executes end-to-end.
- Keywords are correctly classified (set-based lookup via `makeKeywordTable()`).
- Identifiers are correctly scanned with `scanWord()`.
- Number literals are correctly scanned with `scanDigits()`.
- Whitespace (space, tab, CR) is correctly skipped.
- Newlines are correctly emitted as `Newline` tokens.
- EOF handling is correct in both code paths (loop exit and `charAt` returning
  `None`).
- Line/column tracking is implemented and carried through to each token.
- The `Result<Array<Token>, LexError>` return type is correctly constructed.
