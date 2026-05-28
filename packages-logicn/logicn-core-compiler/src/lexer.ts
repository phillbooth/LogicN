// =============================================================================
// LogicN Phase 4 — Lexer
//
// Tokenises LogicN .lln source text using the v1 keyword table.
// Source of truth: docs/Knowledge-Bases/v1-reserved-keywords.md
//
// Types declared locally mirror @logicn/core — structurally compatible.
// Replace with workspace imports once package links are in place.
// =============================================================================

// ---------------------------------------------------------------------------
// Token types (mirrors @logicn/core)
// ---------------------------------------------------------------------------

export type TokenKind =
  | "identifier"
  | "keyword"
  | "string"
  | "number"
  | "boolean"
  | "operator"
  | "symbol"
  | "comment"
  | "docComment"
  | "newline"
  | "eof";

export interface Token {
  readonly kind: TokenKind;
  readonly value: string;
  /** 1-based line number. */
  readonly line: number;
  /** 1-based column number. */
  readonly column: number;
  /** Byte offset of token start (inclusive). */
  readonly start: number;
  /** Byte offset of token end (exclusive). */
  readonly end: number;
}

export interface LexerDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly location?: {
    readonly file: string;
    readonly line: number;
    readonly column: number;
  };
  readonly suggestedFix?: string;
}

export interface LexResult {
  readonly tokens: readonly Token[];
  readonly diagnostics: readonly LexerDiagnostic[];
}

// ---------------------------------------------------------------------------
// V1 keyword sets
// Source: docs/Knowledge-Bases/v1-reserved-keywords.md
// ---------------------------------------------------------------------------

/** Keywords that are active in v0.1 and cannot be used as identifiers. */
export const V1_ACTIVE_KEYWORDS: ReadonlySet<string> = new Set([
  // Flow qualifiers + declaration
  "flow", "secure", "pure", "guarded", "privileged", "unsafe", "experimental",
  // Flow sub-declarations
  "effects", "intent", "governance", "api", "package",
  // Binding
  "let", "mut", "readonly",
  // Control flow
  "match", "if", "else", "return",
  // Declarations
  "type", "enum", "import", "use",
  // Booleans
  "true", "false",
  // Memory keywords (Phase 3–4)
  "borrow", "move", "pinned",
  // Safety keywords
  "block", "fallback", "reason",
  // Value-state keywords (Phase 4)
  "safe", "validated", "unvalidated",
  // Value-state trust/secrecy markers (v1)
  "tainted", "secret", "protected",
  // Compute target (post-v1 runtime; reserved now)
  "compute",
]);

/** Words reserved for post-v1 grammar — produce LLN-SYNTAX-003 if used as identifiers. */
export const V1_FUTURE_RESERVED: ReadonlySet<string> = new Set([
  "shared", "transfer", "remote", "atomic", "barrier",
  "async", "await", "yield", "comptime", "macro",
  "trait", "impl", "where", "for", "while", "loop",
  "break", "continue",
]);

// Two-character operator sequences (order matters — longer first)
const TWO_CHAR_OPERATORS: readonly string[] = [
  "->", "=>", "==", "!=", "<=", ">=", "&&", "||", "..",
];

// Single-character operators
const ONE_CHAR_OPERATORS = new Set(["+", "-", "*", "/", "%", "=", "<", ">", "!", "&", "|", "?"]);

// Punctuation / symbols
const SYMBOLS = new Set(["(", ")", "{", "}", "[", "]", ",", ":", ";", "."]);

// ---------------------------------------------------------------------------
// Lexer implementation
// ---------------------------------------------------------------------------

/**
 * Tokenises a LogicN source string.
 *
 * @param source  Full source text of the .lln file.
 * @param file    File path used in diagnostic locations.
 * @returns       LexResult with tokens array (always ends with an `eof` token)
 *                and any diagnostics.
 */
export function lex(source: string, file: string): LexResult {
  const tokens: Token[] = [];
  const diagnostics: LexerDiagnostic[] = [];

  let pos = 0;
  let line = 1;
  let col = 1;

  // ── Helpers ────────────────────────────────────────────────────────────────

  function peek(offset = 0): string {
    return source[pos + offset] ?? "";
  }

  function advance(): string {
    const ch = source[pos] ?? "";
    pos++;
    if (ch === "\n") {
      line++;
      col = 1;
    } else {
      col++;
    }
    return ch;
  }

  function tok(kind: TokenKind, value: string, startPos: number, startLine: number, startCol: number): Token {
    return { kind, value, line: startLine, column: startCol, start: startPos, end: pos };
  }

  function diag(
    code: string,
    name: string,
    message: string,
    diagLine: number,
    diagCol: number,
    suggestedFix?: string,
  ): void {
    const d: LexerDiagnostic = {
      code,
      name,
      severity: "error",
      message,
      location: { file, line: diagLine, column: diagCol },
      ...(suggestedFix === undefined ? {} : { suggestedFix }),
    };
    diagnostics.push(d);
  }

  // ── Main scan loop ─────────────────────────────────────────────────────────

  while (pos < source.length) {
    const startPos = pos;
    const startLine = line;
    const startCol = col;
    const ch = peek();

    // ── Whitespace (space, tab, carriage return) ───────────────────────────
    if (ch === " " || ch === "\t" || ch === "\r") {
      advance();
      continue;
    }

    // ── Newline ────────────────────────────────────────────────────────────
    if (ch === "\n") {
      advance();
      tokens.push(tok("newline", "\n", startPos, startLine, startCol));
      continue;
    }

    // ── Doc comment /// ────────────────────────────────────────────────────
    if (ch === "/" && peek(1) === "/" && peek(2) === "/") {
      let value = "";
      while (pos < source.length && peek() !== "\n") {
        value += advance();
      }
      tokens.push(tok("docComment", value, startPos, startLine, startCol));
      continue;
    }

    // ── Line comment // ────────────────────────────────────────────────────
    if (ch === "/" && peek(1) === "/") {
      let value = "";
      while (pos < source.length && peek() !== "\n") {
        value += advance();
      }
      tokens.push(tok("comment", value, startPos, startLine, startCol));
      continue;
    }

    // ── String literal "..." ───────────────────────────────────────────────
    if (ch === '"') {
      advance(); // consume opening quote
      let value = '"';
      while (pos < source.length && peek() !== '"' && peek() !== "\n") {
        if (peek() === "\\") {
          value += advance(); // backslash
          if (pos < source.length) value += advance(); // escaped char
        } else {
          value += advance();
        }
      }
      if (peek() === '"') {
        value += advance(); // closing quote
      } else {
        diag(
          "LLN-PARSE-003",
          "UNTERMINATED_STRING",
          "Unterminated string literal.",
          startLine,
          startCol,
          `Close the string with a double-quote character.`,
        );
      }
      tokens.push(tok("string", value, startPos, startLine, startCol));
      continue;
    }

    // ── Number literal (integer, decimal, underscore separators) ──────────
    if (ch >= "0" && ch <= "9") {
      let value = "";
      while (pos < source.length && ((peek() >= "0" && peek() <= "9") || peek() === "_")) {
        value += advance();
      }
      // Decimal part
      if (peek() === "." && peek(1) >= "0" && peek(1) <= "9") {
        value += advance(); // dot
        while (pos < source.length && (peek() >= "0" && peek() <= "9")) {
          value += advance();
        }
      }
      tokens.push(tok("number", value, startPos, startLine, startCol));
      continue;
    }

    // ── Two-character operators ────────────────────────────────────────────
    const twoChar = ch + peek(1);
    if (TWO_CHAR_OPERATORS.includes(twoChar)) {
      advance();
      advance();
      tokens.push(tok("operator", twoChar, startPos, startLine, startCol));
      continue;
    }

    // ── Single-character operators ─────────────────────────────────────────
    if (ONE_CHAR_OPERATORS.has(ch)) {
      advance();
      tokens.push(tok("operator", ch, startPos, startLine, startCol));
      continue;
    }

    // ── Punctuation / symbols ──────────────────────────────────────────────
    if (SYMBOLS.has(ch)) {
      advance();
      tokens.push(tok("symbol", ch, startPos, startLine, startCol));
      continue;
    }

    // ── Identifiers and keywords ───────────────────────────────────────────
    if (isIdentStart(ch)) {
      let value = "";
      while (pos < source.length && isIdentContinue(peek())) {
        value += advance();
      }

      if (V1_ACTIVE_KEYWORDS.has(value)) {
        tokens.push(tok("keyword", value, startPos, startLine, startCol));
      } else if (V1_FUTURE_RESERVED.has(value)) {
        diag(
          "LLN-SYNTAX-003",
          "FUTURE_RESERVED_KEYWORD",
          `"${value}" is reserved for future use and cannot be used as an identifier.`,
          startLine,
          startCol,
          `Rename the identifier. "${value}" is reserved for a planned LogicN feature.`,
        );
        // Emit as keyword so the parser can skip gracefully
        tokens.push(tok("keyword", value, startPos, startLine, startCol));
      } else {
        tokens.push(tok("identifier", value, startPos, startLine, startCol));
      }
      continue;
    }

    // ── Unknown character ──────────────────────────────────────────────────
    diag(
      "LLN-PARSE-001",
      "UNEXPECTED_TOKEN",
      `Unexpected character: '${ch}' (U+${ch.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}).`,
      startLine,
      startCol,
    );
    advance(); // skip unknown character to continue scanning
  }

  // ── EOF sentinel ───────────────────────────────────────────────────────────
  tokens.push({ kind: "eof", value: "", line, column: col, start: pos, end: pos });

  return { tokens, diagnostics };
}

// ---------------------------------------------------------------------------
// Character classification helpers
// ---------------------------------------------------------------------------

function isIdentStart(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}

function isIdentContinue(ch: string): boolean {
  return isIdentStart(ch) || (ch >= "0" && ch <= "9");
}
