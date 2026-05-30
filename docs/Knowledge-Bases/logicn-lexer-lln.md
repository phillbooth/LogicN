# LogicN Lexer — `src/lexer.lln`

**Phase 12 Stage B, Milestone 1**

## What it is

`src/lexer.lln` is the LogicN lexer written in LogicN itself. It is the first
component of the self-hosted compiler — the first proof that LogicN can describe
its own tools.

When compiled by the TypeScript bootstrapper and executed, `lexer.lln` must
produce an identical token stream to the existing TypeScript lexer (`src/lexer.ts`).

---

## Language features required from the runtime

| Feature | Source | Status |
|---|---|---|
| `while pos < n` loops | Phase 12A | Not built |
| `mut` bindings with reassignment | Phase 11A.4/11 | Parsed; runtime wiring pending |
| `for item in list` iteration | Phase 12A | Not built |
| `String.charAt(pos)` | Stdlib | Available |
| `String.codePoints()` | Stdlib | Available |
| `Array.empty()` | Stdlib | Available |
| `Array.push()` / `Array.append()` | Stdlib | Available |
| `record` types | Phase 4 | Available |
| `match` expressions on Char | Phase 4 | Available |
| `Result<T, E>` / `Ok` / `Err` | Phase 4 | Available |
| `Option<T>` / `Some` / `None` | Phase 4 | Available |

The primary Phase 12A blocker is `while` loop support in the interpreter.
`mut` reassignment runtime wiring (Phase 11A.4) is the secondary blocker.

---

## Token type

```logicn
record Token {
  kind: TokenKind
  value: String
  line: Int
  column: Int
}

enum TokenKind {
  Identifier
  Keyword
  StringLiteral
  NumberLiteral
  Operator
  Symbol
  Comment
  Newline
  Eof
}
```

`Token` is a pure data record — no methods, no owned resources. It is safe to
copy freely inside the `Array<Token>` return value.

---

## Lexer flow structure

```logicn
pure flow tokenize(source: String) -> LexerResult

contract {
  types {
    type LexerResult = Result<Array<Token>, LexError>
    type LexError = { message: String, line: Int, column: Int }
  }

  intent {
    "Tokenize LogicN source text into a stream of tokens."
  }
}
{
  mut pos: Int = 0
  mut line: Int = 1
  mut col: Int = 1
  mut tokens: Array<Token> = Array.empty()

  while pos < source.charCount() {
    let ch: Option<Char> = source.charAt(pos)

    match ch {
      None => {
        // End of source — emit Eof and stop
        let eof: Token = Token {
          kind: TokenKind.Eof
          value: ""
          line: line
          column: col
        }
        tokens = tokens.append(eof)
        return Ok(tokens)
      }

      Some(c) => {
        // Character classification via match
        match c {
          ' ' | '\t' => {
            // Skip whitespace
            pos = pos + 1
            col = col + 1
          }

          '\n' => {
            let tok: Token = Token {
              kind: TokenKind.Newline
              value: "\n"
              line: line
              column: col
            }
            tokens = tokens.append(tok)
            pos = pos + 1
            line = line + 1
            col = 1
          }

          '"' => {
            // String literal scanning with escape handling
            // ... see String literal section below
          }

          _ => {
            // Identifier, keyword, number, operator, or symbol
            // ... see dispatch section below
          }
        }
      }
    }
  }

  // Implicit EOF at end of source
  let eof: Token = Token {
    kind: TokenKind.Eof
    value: ""
    line: line
    column: col
  }
  tokens = tokens.append(eof)
  return Ok(tokens)
}
```

---

## Key implementation patterns

### Character classification

```logicn
pure flow isLetter(c: Char) -> Bool {
  let cp: Int = c.codePoint()
  return (cp >= 65 and cp <= 90) or (cp >= 97 and cp <= 122) or cp == 95
}

pure flow isDigit(c: Char) -> Bool {
  let cp: Int = c.codePoint()
  return cp >= 48 and cp <= 57
}

pure flow isAlphanumeric(c: Char) -> Bool {
  return isLetter(c) or isDigit(c)
}
```

### Identifier and keyword scanning

```logicn
pure flow scanIdentifier(source: String, pos: Int, line: Int, col: Int) -> Token {
  mut end: Int = pos
  while end < source.charCount() {
    let ch: Option<Char> = source.charAt(end)
    match ch {
      None => { end = source.charCount() }
      Some(c) => {
        if isAlphanumeric(c) {
          end = end + 1
        } else {
          end = source.charCount()  // break
        }
      }
    }
  }
  let word: String = source.slice(pos, end)
  let kind: TokenKind = if KEYWORDS.contains(word) {
    TokenKind.Keyword
  } else {
    TokenKind.Identifier
  }
  return Token { kind: kind, value: word, line: line, column: col }
}
```

Keyword detection checks if the scanned identifier matches a known keyword list.
The keyword list mirrors `V1_ACTIVE_KEYWORDS` in `src/lexer.ts`.

### String literal scanning with escape handling

```logicn
pure flow scanString(source: String, pos: Int, line: Int, col: Int) -> Result<Token, LexError>
{
  // pos is pointing at the opening "
  mut i: Int = pos + 1
  mut chars: String = ""

  while i < source.charCount() {
    let ch: Option<Char> = source.charAt(i)
    match ch {
      None => {
        return Err(LexError { message: "Unterminated string literal", line: line, column: col })
      }
      Some(c) => {
        match c {
          '"' => {
            // End of string literal
            return Ok(Token {
              kind: TokenKind.StringLiteral
              value: chars
              line: line
              column: col
            })
          }
          '\\' => {
            // Escape sequence
            let next: Option<Char> = source.charAt(i + 1)
            match next {
              None => {
                return Err(LexError { message: "Incomplete escape sequence", line: line, column: col })
              }
              Some(esc) => {
                match esc {
                  'n'  => { chars = chars + "\n" }
                  't'  => { chars = chars + "\t" }
                  '"'  => { chars = chars + "\"" }
                  '\\' => { chars = chars + "\\" }
                  _    => { chars = chars + "\\" + esc.toString() }
                }
                i = i + 2
              }
            }
          }
          _ => {
            chars = chars + c.toString()
            i = i + 1
          }
        }
      }
    }
  }

  return Err(LexError { message: "Unterminated string literal", line: line, column: col })
}
```

### Number literal scanning

Supports decimal, hex (`0x`), binary (`0b`), and octal (`0o`):

```logicn
pure flow scanNumber(source: String, pos: Int, line: Int, col: Int) -> Token {
  mut i: Int = pos
  let first: Option<Char> = source.charAt(i)
  let second: Option<Char> = source.charAt(i + 1)

  // Detect base prefix
  match (first, second) {
    (Some('0'), Some('x')) => { i = i + 2 }  // hex
    (Some('0'), Some('b')) => { i = i + 2 }  // binary
    (Some('0'), Some('o')) => { i = i + 2 }  // octal
    _ => { }                                   // decimal
  }

  while i < source.charCount() {
    let ch: Option<Char> = source.charAt(i)
    match ch {
      None => { i = source.charCount() }
      Some(c) => {
        if isDigit(c) or c == '_' or c == '.' {
          i = i + 1
        } else {
          i = source.charCount()  // break
        }
      }
    }
  }

  let numStr: String = source.slice(pos, i)
  return Token { kind: TokenKind.NumberLiteral, value: numStr, line: line, column: col }
}
```

---

## Checklist for `lexer.lln` to be valid LogicN

- [ ] Uses `while` loops (requires Phase 12A loop support in interpreter)
- [ ] Uses `mut` reassignment (`pos = pos + 1`, `tokens = tokens.append(tok)`) — requires Phase 11A.4/11 assignment runtime wiring
- [ ] Uses stdlib: `String.charAt`, `String.charCount`, `String.slice`, `Array.empty`, `Array.append`
- [ ] Uses `match` on `Char` for character classification
- [ ] Uses `match` on `Option<Char>` for safe single-character reads
- [ ] All functions are `pure flow` (no side effects — tokenizing is pure)
- [ ] Returns `Result<Array<Token>, LexError>` for error handling (unterminated strings, invalid escapes)
- [ ] Keyword detection via a `Set<String>` or `Array<String>` contains check
- [ ] Line and column tracking throughout

---

## Stub implementation (parses with current compiler)

This stub is valid LogicN as understood by the current parser (Phase 4+). It
will parse successfully but cannot be executed until Phase 12A loop support
lands. It serves as a placeholder that can be loaded by the bootstrapper.

```logicn
pure flow tokenize(source: String) -> LexerResult

contract {
  types {
    type LexerResult = Result<Array<Token>, LexError>
  }

  intent {
    "Tokenize LogicN source text into a stream of tokens."
  }
}
{
  mut pos: Int = 0
  mut tokens: Array<Token> = Array.empty()

  // Implementation requires Phase 12A while-loop support.
  // When Phase 12A lands: replace this stub with the full scanning loop.

  let eof: Token = Token {
    kind: TokenKind.Eof
    value: ""
    line: 1
    column: 1
  }

  return Ok(tokens.append(eof))
}
```

---

## Integration with the bootstrapper

Once `lexer.lln` passes its own tests, the bootstrapper compiles it:

```bash
logicn build src/lexer.lln --target node-js
```

The resulting module is loaded instead of `src/lexer.ts`. The CI test suite
runs the two lexers in parallel on the same inputs and diffs their token streams:

```text
lexer.ts output == lexer.lln output   => PASS
```

Any difference is a regression in the self-hosted lexer.

---

## See also

- `logicn-roadmap.md` — Phase 12 milestone overview
- `src/lexer.ts` — TypeScript reference implementation
- `docs/Knowledge-Bases/core-syntax-keywords.md` — keyword list
- `docs/Knowledge-Bases/logicn-syntax-loops-iteration.md` — loop syntax spec
- `docs/Knowledge-Bases/arrays-and-string-operations.md` — stdlib surface
