// =============================================================================
// LogicN Phase 4 — Recursive Descent Parser
//
// Parses LogicN .lln source text into an AstNode tree.
// Grammar: docs/Knowledge-Bases/phase-4-parser-ast-plan.md
//
// Entry point: parseProgram(source, file)
//
// AstNodeKind values mirror @logicn/core — structurally compatible.
// FlowDeclarationMetadata mirrors @logicn/core FlowDeclarationMetadata.
// =============================================================================

import { lex, type Token, type LexerDiagnostic } from "./lexer.js";

// ---------------------------------------------------------------------------
// AST types (mirrors @logicn/core)
// ---------------------------------------------------------------------------

/**
 * All AST node kinds used by the Phase 4 parser.
 * Subset of the full AstNodeKind union in @logicn/core.
 */
export type AstNodeKind =
  | "program"
  | "importDecl"
  | "typeDecl"
  | "enumDecl"
  | "intentDecl"
  | "governanceDecl"
  | "apiDecl"
  // Flow declarations
  | "flowDecl"
  | "secureFlowDecl"
  | "pureFlowDecl"
  // Flow sub-nodes
  | "paramDecl"
  | "typeRef"
  | "effectsDecl"
  | "effectRef"
  | "block"
  // Statements
  | "letDecl"
  | "mutDecl"
  | "readonlyDecl"
  | "returnStmt"
  | "ifStmt"
  | "matchExpr"
  | "matchArm"
  // Expressions
  | "callExpr"
  | "memberExpr"
  | "binaryExpr"
  | "unaryExpr"
  | "identifier"
  | "stringLiteral"
  | "numberLiteral"
  | "boolLiteral"
  | "errorPropagation";

export interface SourceLocation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
}

export interface AstNode {
  readonly kind: AstNodeKind;
  readonly location?: SourceLocation;
  readonly children?: readonly AstNode[];
  readonly value?: string;
}

export interface ParseDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "info" | "warning" | "error";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
}

/** Metadata extracted from a flow declaration header. */
export interface FlowMeta {
  readonly name: string;
  readonly qualifier: "flow" | "secure" | "pure";
  readonly params: readonly string[];
  readonly returnType: string;
  readonly declaredEffects: readonly string[];
  readonly location: SourceLocation;
}

export interface ParseResult {
  /** Root program node. Present even when there are diagnostics. */
  readonly ast: AstNode;
  readonly diagnostics: readonly ParseDiagnostic[];
  /** Extracted flow metadata — available even with partial parse errors. */
  readonly flows: readonly FlowMeta[];
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class Parser {
  private pos = 0;
  private readonly diagnostics: ParseDiagnostic[] = [];
  private readonly flows: FlowMeta[] = [];

  constructor(
    private readonly tokens: readonly Token[],
    private readonly file: string,
  ) {}

  parse(): { ast: AstNode; diagnostics: readonly ParseDiagnostic[]; flows: readonly FlowMeta[] } {
    const program = this.parseProgram();
    return {
      ast: program,
      diagnostics: [...this.diagnostics],
      flows: [...this.flows],
    };
  }

  // ── Top-level ─────────────────────────────────────────────────────────────

  private parseProgram(): AstNode {
    const children: AstNode[] = [];
    const loc = this.loc();

    while (!this.isEof()) {
      this.skipNewlines();
      if (this.isEof()) break;

      const decl = this.parseDeclaration();
      if (decl !== undefined) {
        children.push(decl);
      }
    }

    return { kind: "program", location: loc, children };
  }

  private parseDeclaration(): AstNode | undefined {
    const tok = this.current();

    if (tok.kind === "keyword") {
      switch (tok.value) {
        case "import":   return this.parseImportDecl();
        case "type":     return this.parseTypeDecl();
        case "enum":     return this.parseEnumDecl();
        case "flow":     return this.parseFlowDecl("flow");
        case "secure":   return this.parseSecureOrPureFlow();
        case "pure":     return this.parsePureFlow();
        case "intent":   return this.parseGenericBlock("intentDecl");
        case "governance": return this.parseGenericBlock("governanceDecl");
        case "api":      return this.parseGenericBlock("apiDecl");
        // Skip unknown keywords at top level
        default:
          this.emitUnexpected(`Unexpected keyword "${tok.value}" at top level.`);
          this.advance();
          return undefined;
      }
    }

    if (tok.kind === "newline") {
      this.advance();
      return undefined;
    }

    // Unknown token at top level
    this.emitUnexpected(`Unexpected token "${tok.value}" at top level.`);
    this.advance();
    return undefined;
  }

  // ── Flow declarations ─────────────────────────────────────────────────────

  /**
   * Parses a plain `flow name(params) -> ret [effects [...]] { body }`.
   * `qualifier` is "flow" | "secure" | "pure" (caller has consumed the qualifier).
   */
  private parseFlowDecl(qualifier: "flow" | "secure" | "pure"): AstNode {
    const loc = this.loc();
    const kind: AstNodeKind =
      qualifier === "secure" ? "secureFlowDecl"
      : qualifier === "pure" ? "pureFlowDecl"
      : "flowDecl";

    // Consume "flow" keyword
    this.expect("keyword", "flow");

    // Flow name
    const nameTok = this.expect("identifier");
    const name = nameTok?.value ?? "<unknown>";

    // Parameters
    this.expect("symbol", "(");
    const params = this.parseParamList();
    this.expect("symbol", ")");

    // Return type  `->`
    this.expect("operator", "->");
    const retTypeNode = this.parseTypeRef();
    const returnType = retTypeNode.value ?? "";

    // Optional effects declaration on the next line(s)
    this.skipNewlines();
    let effectsNode: AstNode | undefined;
    let effectNames: string[] = [];
    if (this.currentIs("keyword", "effects")) {
      const result = this.parseEffectsDecl();
      effectsNode = result.node;
      effectNames = result.names;
    }

    // Body block
    this.skipNewlines();
    const body = this.parseBlock();

    // Extract metadata
    const meta: FlowMeta = {
      name,
      qualifier,
      params: params.map((p) => p.value ?? ""),
      returnType,
      declaredEffects: effectNames,
      location: loc,
    };
    this.flows.push(meta);

    const children: AstNode[] = [
      ...params,
      retTypeNode,
      ...(effectsNode !== undefined ? [effectsNode] : []),
      body,
    ];

    return { kind, value: name, location: loc, children };
  }

  private parseSecureOrPureFlow(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "secure"

    if (!this.currentIs("keyword", "flow")) {
      this.emit(
        "LLN-PARSE-002",
        "EXPECTED_FLOW_KEYWORD",
        `Expected "flow" after "secure".`,
        loc,
        `Write: secure flow name(params) -> ReturnType { ... }`,
      );
      // Try to recover by treating as plain flow if "flow" is next
    }

    return this.parseFlowDecl("secure");
  }

  private parsePureFlow(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "pure"

    if (!this.currentIs("keyword", "flow")) {
      this.emit(
        "LLN-PARSE-002",
        "EXPECTED_FLOW_KEYWORD",
        `Expected "flow" after "pure".`,
        loc,
        `Write: pure flow name(params) -> ReturnType { ... }`,
      );
    }

    return this.parseFlowDecl("pure");
  }

  // ── Parameters ────────────────────────────────────────────────────────────

  private parseParamList(): AstNode[] {
    const params: AstNode[] = [];

    while (!this.currentIs("symbol", ")") && !this.isEof()) {
      this.skipNewlines();
      if (this.currentIs("symbol", ")")) break;

      const prevPos = this.pos;
      const param = this.parseParam();
      if (param !== undefined) params.push(param);
      // Safety guard: force progress if parseParam didn't consume any tokens
      // (prevents infinite loops when parseParam emits an error and returns undefined)
      if (this.pos === prevPos && !this.isEof()) {
        this.advance();
      }

      this.skipNewlines();
      if (this.currentIs("symbol", ",")) {
        this.advance(); // consume comma
      }
    }

    return params;
  }

  private parseParam(): AstNode | undefined {
    const loc = this.loc();
    const nameTok = this.current();

    if (nameTok.kind !== "identifier") {
      this.emitUnexpected(`Expected parameter name, got "${nameTok.value}".`);
      return undefined;
    }

    this.advance(); // name
    this.expect("symbol", ":");
    const typeRef = this.parseTypeRef();

    const paramText = `${nameTok.value}: ${typeRef.value ?? ""}`;
    return { kind: "paramDecl", value: paramText, location: loc, children: [typeRef] };
  }

  // ── Type references ────────────────────────────────────────────────────────

  /**
   * Parses a type reference such as `Int`, `String`, `Result<T, E>`,
   * `ApiResponse<OrderStatusResponse>`.
   *
   * Handles nested angle-bracket generics with a depth counter.
   */
  private parseTypeRef(): AstNode {
    const loc = this.loc();
    let value = "";

    // Base type name
    const base = this.current();
    if (base.kind === "identifier" || base.kind === "keyword") {
      value += base.value;
      this.advance();
    } else {
      this.emitUnexpected(`Expected type name, got "${base.value}".`);
      return { kind: "typeRef", value: "<unknown>", location: loc };
    }

    // Optional generic arguments
    if (this.currentIs("operator", "<")) {
      value += "<";
      this.advance();
      let depth = 1;

      while (!this.isEof() && depth > 0) {
        const t = this.current();
        if (t.kind === "operator" && t.value === "<") {
          depth++;
          value += "<";
          this.advance();
        } else if (t.kind === "operator" && t.value === ">") {
          depth--;
          value += ">";
          this.advance();
        } else if (t.kind === "newline") {
          this.advance(); // allow newlines inside generics
        } else {
          value += t.value;
          this.advance();
        }
      }
    }

    return { kind: "typeRef", value, location: loc };
  }

  // ── Effects declaration ────────────────────────────────────────────────────

  private parseEffectsDecl(): { node: AstNode; names: string[] } {
    const loc = this.loc();
    const names: string[] = [];

    this.advance(); // consume "effects"
    this.expect("symbol", "[");

    while (!this.currentIs("symbol", "]") && !this.isEof()) {
      this.skipNewlines();
      if (this.currentIs("symbol", "]")) break;

      const prevPos = this.pos;
      const effectNode = this.parseEffectRef();
      if (effectNode !== undefined) {
        names.push(effectNode.value ?? "");
      }
      // Safety guard: force progress if parseEffectRef didn't consume any tokens
      if (this.pos === prevPos && !this.isEof()) {
        this.advance();
      }

      this.skipNewlines();
      if (this.currentIs("symbol", ",")) {
        this.advance();
      }
    }

    this.expect("symbol", "]");

    const children: AstNode[] = names.map((n) => ({
      kind: "effectRef" as AstNodeKind,
      value: n,
    }));

    return {
      node: { kind: "effectsDecl", location: loc, children, value: names.join(", ") },
      names,
    };
  }

  private parseEffectRef(): AstNode | undefined {
    const loc = this.loc();
    let value = "";
    const tok = this.current();

    if (tok.kind !== "identifier" && tok.kind !== "keyword") {
      this.emitUnexpected(`Expected effect name, got "${tok.value}".`);
      return undefined;
    }

    value += tok.value;
    this.advance();

    // Dot-path: database.read, audit.write, etc.
    while (this.currentIs("symbol", ".")) {
      this.advance(); // consume dot
      const next = this.current();
      if (next.kind === "identifier" || next.kind === "keyword") {
        value += "." + next.value;
        this.advance();
      } else {
        break;
      }
    }

    return { kind: "effectRef", value, location: loc };
  }

  // ── Block and statements ───────────────────────────────────────────────────

  private parseBlock(): AstNode {
    const loc = this.loc();
    const children: AstNode[] = [];

    this.expect("symbol", "{");
    this.skipNewlines();

    while (!this.currentIs("symbol", "}") && !this.isEof()) {
      const stmt = this.parseStatement();
      if (stmt !== undefined) {
        children.push(stmt);
      }
      this.skipNewlines();
    }

    this.expect("symbol", "}");
    return { kind: "block", location: loc, children };
  }

  private parseStatement(): AstNode | undefined {
    this.skipNewlines();
    const tok = this.current();

    if (tok.kind === "keyword") {
      switch (tok.value) {
        case "let":    return this.parseLetDecl();
        case "mut":    return this.parseMutDecl();
        case "return": return this.parseReturnStmt();
        case "if":     return this.parseIfStmt();
        case "match":  return this.parseMatchExpr();
        default: break;
      }
    }

    if (tok.kind === "identifier" || tok.kind === "number" || tok.kind === "string" || tok.kind === "boolean") {
      return this.parseExprStatement();
    }

    if (tok.kind === "comment" || tok.kind === "docComment") {
      this.advance();
      return undefined;
    }

    if (tok.kind === "newline") {
      this.advance();
      return undefined;
    }

    // Unexpected token in statement position
    this.emitUnexpected(`Unexpected token "${tok.value}" in statement position.`);
    this.advance();
    return undefined;
  }

  private parseLetDecl(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "let"

    const nameTok = this.expect("identifier");
    const name = nameTok?.value ?? "<unknown>";

    // Optional type annotation
    let typeValue = "";
    if (this.currentIs("symbol", ":")) {
      this.advance();
      // Consume optional value-state annotations (safe/unsafe, validated/unvalidated)
      const typeNode = this.parseTypeRefWithValueState();
      typeValue = typeNode.value ?? "";
    }

    this.expect("operator", "=");
    const init = this.parseExpression();

    const value = typeValue !== "" ? `${name}: ${typeValue}` : name;
    return { kind: "letDecl", value, location: loc, children: [init] };
  }

  private parseMutDecl(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "mut"

    const nameTok = this.expect("identifier");
    const name = nameTok?.value ?? "<unknown>";

    let typeValue = "";
    if (this.currentIs("symbol", ":")) {
      this.advance();
      const typeNode = this.parseTypeRefWithValueState();
      typeValue = typeNode.value ?? "";
    }

    this.expect("operator", "=");
    const init = this.parseExpression();

    const value = typeValue !== "" ? `${name}: ${typeValue}` : name;
    return { kind: "mutDecl", value, location: loc, children: [init] };
  }

  /**
   * Parses a type reference that may include value-state annotations:
   *   `String unsafe unvalidated`
   *   `Email safe validated`
   */
  private parseTypeRefWithValueState(): AstNode {
    const loc = this.loc();
    const typeRef = this.parseTypeRef();
    let value = typeRef.value ?? "";

    // Optional value-state: "unsafe unvalidated" | "safe validated"
    if (this.currentIs("keyword", "unsafe") || this.currentIs("keyword", "safe")) {
      const state = this.current().value;
      this.advance();
      value += " " + state;
      if (this.currentIs("keyword", "unvalidated") || this.currentIs("keyword", "validated")) {
        value += " " + this.current().value;
        this.advance();
      }
    }

    return { kind: "typeRef", value, location: loc };
  }

  private parseReturnStmt(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "return"

    const children: AstNode[] = [];
    // Return with no value if followed by newline or }
    if (!this.currentIs("newline", "\n") && !this.currentIs("symbol", "}") && !this.isEof()) {
      children.push(this.parseExpression());
    }

    return { kind: "returnStmt", location: loc, children };
  }

  private parseIfStmt(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "if"

    const condition = this.parseExpression();
    const thenBlock = this.parseBlock();
    const children: AstNode[] = [condition, thenBlock];

    this.skipNewlines();
    if (this.currentIs("keyword", "else")) {
      this.advance();
      this.skipNewlines();
      const elseBlock = this.parseBlock();
      children.push(elseBlock);
    }

    return { kind: "ifStmt", location: loc, children };
  }

  private parseMatchExpr(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "match"

    const subject = this.parseExpression();
    this.skipNewlines();
    this.expect("symbol", "{");

    const arms: AstNode[] = [];
    this.skipNewlines();

    while (!this.currentIs("symbol", "}") && !this.isEof()) {
      const arm = this.parseMatchArm();
      if (arm !== undefined) arms.push(arm);
      this.skipNewlines();
    }

    this.expect("symbol", "}");
    return { kind: "matchExpr", location: loc, children: [subject, ...arms] };
  }

  private parseMatchArm(): AstNode | undefined {
    const loc = this.loc();
    const pattern = this.current();

    if (pattern.kind !== "identifier" && pattern.kind !== "keyword") {
      this.emitUnexpected(`Expected match arm pattern, got "${pattern.value}".`);
      this.advance();
      return undefined;
    }

    const patternValue = pattern.value;
    this.advance();
    this.expect("operator", "=>");

    let body: AstNode;
    this.skipNewlines();
    if (this.currentIs("symbol", "{")) {
      body = this.parseBlock();
    } else {
      body = this.parseExprStatement() ?? { kind: "block", location: loc };
    }

    return {
      kind: "matchArm",
      value: patternValue,
      location: loc,
      children: [body],
    };
  }

  private parseExprStatement(): AstNode | undefined {
    const loc = this.loc();
    const expr = this.parseExpression();
    return { kind: "block", value: "(expr)", location: loc, children: [expr] };
  }

  // ── Expressions ────────────────────────────────────────────────────────────

  /**
   * Expression parser.
   * Handles: assignment, comparison, additive, unary, primary.
   * Simplified for Phase 4 — full operator precedence in Phase 5.
   */
  private parseExpression(): AstNode {
    return this.parseComparison();
  }

  private parseComparison(): AstNode {
    let left = this.parseAdditive();

    while (this.currentIsOneOf("operator", ["==", "!=", "<", ">", "<=", ">=", "&&", "||"])) {
      const op = this.current().value;
      const loc = this.loc();
      this.advance();
      const right = this.parseAdditive();
      left = { kind: "binaryExpr", value: op, location: loc, children: [left, right] };
    }

    return left;
  }

  private parseAdditive(): AstNode {
    let left = this.parseUnary();

    while (this.currentIsOneOf("operator", ["+", "-"])) {
      const op = this.current().value;
      const loc = this.loc();
      this.advance();
      const right = this.parseUnary();
      left = { kind: "binaryExpr", value: op, location: loc, children: [left, right] };
    }

    return left;
  }

  private parseUnary(): AstNode {
    if (this.currentIs("operator", "!") || this.currentIs("operator", "-")) {
      const loc = this.loc();
      const op = this.current().value;
      this.advance();
      const operand = this.parsePostfix();
      return { kind: "unaryExpr", value: op, location: loc, children: [operand] };
    }

    return this.parsePostfix();
  }

  /** Handles postfix `?` (error propagation) and method chains. */
  private parsePostfix(): AstNode {
    let expr = this.parsePrimary();

    while (true) {
      if (this.currentIs("symbol", ".")) {
        // Member access or method call
        const loc = this.loc();
        this.advance(); // consume dot
        const memberTok = this.current();
        const member = memberTok.value;
        this.advance();

        if (this.currentIs("symbol", "(")) {
          // Method call
          this.advance(); // (
          const args = this.parseArgList();
          this.expect("symbol", ")");
          expr = {
            kind: "callExpr",
            value: member,
            location: loc,
            children: [expr, ...args],
          };
        } else {
          expr = { kind: "memberExpr", value: member, location: loc, children: [expr] };
        }
      } else if (this.currentIs("operator", "?")) {
        // Error propagation: expr?
        const loc = this.loc();
        this.advance();
        expr = { kind: "errorPropagation", location: loc, children: [expr] };
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): AstNode {
    const loc = this.loc();
    const tok = this.current();

    // Grouped expression
    if (tok.kind === "symbol" && tok.value === "(") {
      this.advance();
      const inner = this.parseExpression();
      this.expect("symbol", ")");
      return inner;
    }

    // String literal
    if (tok.kind === "string") {
      this.advance();
      return { kind: "stringLiteral", value: tok.value, location: loc };
    }

    // Number literal
    if (tok.kind === "number") {
      this.advance();
      return { kind: "numberLiteral", value: tok.value, location: loc };
    }

    // Boolean literal
    if (tok.kind === "keyword" && (tok.value === "true" || tok.value === "false")) {
      this.advance();
      return { kind: "boolLiteral", value: tok.value, location: loc };
    }

    // Block literal (struct construction or object) — simplified: skip to matching }
    if (tok.kind === "symbol" && tok.value === "{") {
      return this.parseBlock();
    }

    // Identifier or function call
    if (tok.kind === "identifier") {
      this.advance();
      const name = tok.value;

      if (this.currentIs("symbol", "(")) {
        // Function call
        this.advance(); // (
        const args = this.parseArgList();
        this.expect("symbol", ")");
        return { kind: "callExpr", value: name, location: loc, children: args };
      }

      return { kind: "identifier", value: name, location: loc };
    }

    // Fallback for keywords used in expression position (e.g. Ok, Err, enum variants)
    if (tok.kind === "keyword") {
      this.advance();
      return { kind: "identifier", value: tok.value, location: loc };
    }

    this.emitUnexpected(`Expected expression, got "${tok.value}".`);
    this.advance();
    return { kind: "identifier", value: "<error>", location: loc };
  }

  private parseArgList(): AstNode[] {
    const args: AstNode[] = [];

    while (!this.currentIs("symbol", ")") && !this.isEof()) {
      this.skipNewlines();
      if (this.currentIs("symbol", ")")) break;

      // Named argument: name: value
      if (
        this.current().kind === "identifier" &&
        this.peek(1).kind === "symbol" &&
        this.peek(1).value === ":"
      ) {
        const loc = this.loc();
        const label = this.current().value;
        this.advance(); // name
        this.advance(); // :
        const val = this.parseExpression();
        args.push({ kind: "identifier", value: label, location: loc, children: [val] });
      } else {
        args.push(this.parseExpression());
      }

      this.skipNewlines();
      if (this.currentIs("symbol", ",")) {
        this.advance();
      }
    }

    return args;
  }

  // ── Generic block parser (for intent, governance, api) ────────────────────

  /**
   * Parses a named block declaration that is not yet fully specified.
   * Consumes until the matching closing `}`.
   */
  private parseGenericBlock(kind: AstNodeKind): AstNode {
    const loc = this.loc();
    const keyword = this.current().value;
    this.advance(); // consume keyword

    let name = "";
    if (this.current().kind === "identifier") {
      name = this.current().value;
      this.advance();
    }

    // Skip to opening brace
    while (!this.currentIs("symbol", "{") && !this.isEof()) {
      this.advance();
    }

    if (this.currentIs("symbol", "{")) {
      this.skipBalancedBraces();
    }

    return { kind, value: `${keyword} ${name}`.trim(), location: loc };
  }

  /** Skips a balanced `{ ... }` block without parsing the interior. */
  private skipBalancedBraces(): void {
    let depth = 0;
    while (!this.isEof()) {
      const tok = this.current();
      if (tok.kind === "symbol" && tok.value === "{") {
        depth++;
        this.advance();
      } else if (tok.kind === "symbol" && tok.value === "}") {
        depth--;
        this.advance();
        if (depth <= 0) break;
      } else {
        this.advance();
      }
    }
  }

  // ── Import / type / enum stubs ────────────────────────────────────────────

  private parseImportDecl(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "import"
    let value = "";
    while (!this.isEof() && this.current().kind !== "newline") {
      value += this.current().value + " ";
      this.advance();
    }
    return { kind: "importDecl", value: value.trim(), location: loc };
  }

  private parseTypeDecl(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "type"
    const name = this.current().kind === "identifier" ? this.current().value : "<unknown>";
    if (this.current().kind === "identifier") this.advance();

    if (this.currentIs("symbol", "{")) {
      this.skipBalancedBraces();
    } else {
      // `type Name = ...` form
      while (!this.isEof() && this.current().kind !== "newline") {
        this.advance();
      }
    }

    return { kind: "typeDecl", value: name, location: loc };
  }

  private parseEnumDecl(): AstNode {
    const loc = this.loc();
    this.advance(); // consume "enum"
    const name = this.current().kind === "identifier" ? this.current().value : "<unknown>";
    if (this.current().kind === "identifier") this.advance();
    if (this.currentIs("symbol", "{")) this.skipBalancedBraces();
    return { kind: "enumDecl", value: name, location: loc };
  }

  // ── Diagnostic helpers ────────────────────────────────────────────────────

  private emit(
    code: string,
    name: string,
    message: string,
    location: SourceLocation,
    suggestedFix?: string,
  ): void {
    const d: ParseDiagnostic = {
      code, name, severity: "error", message, location,
      ...(suggestedFix === undefined ? {} : { suggestedFix }),
    };
    this.diagnostics.push(d);
  }

  private emitUnexpected(message: string): void {
    this.emit("LLN-PARSE-001", "UNEXPECTED_TOKEN", message, this.loc());
  }

  // ── Token stream helpers ───────────────────────────────────────────────────

  private current(): Token {
    return this.tokens[this.pos] ?? { kind: "eof", value: "", line: 0, column: 0, start: 0, end: 0 };
  }

  private peek(offset: number): Token {
    return this.tokens[this.pos + offset] ?? { kind: "eof", value: "", line: 0, column: 0, start: 0, end: 0 };
  }

  private advance(): Token {
    const tok = this.current();
    if (!this.isEof()) this.pos++;
    return tok;
  }

  private isEof(): boolean {
    return this.current().kind === "eof";
  }

  private currentIs(kind: Token["kind"], value: string): boolean {
    const tok = this.current();
    return tok.kind === kind && tok.value === value;
  }

  private currentIsOneOf(kind: Token["kind"], values: string[]): boolean {
    const tok = this.current();
    return tok.kind === kind && values.includes(tok.value);
  }

  private skipNewlines(): void {
    while (this.current().kind === "newline" || this.current().kind === "comment" || this.current().kind === "docComment") {
      this.pos++;
    }
  }

  private loc(): SourceLocation {
    const tok = this.current();
    return { file: this.file, line: tok.line, column: tok.column };
  }

  /**
   * Expects a specific token. Returns the token if found, emits a diagnostic
   * and returns undefined otherwise. Advances past the token.
   */
  private expect(kind: Token["kind"], value?: string): Token | undefined {
    const tok = this.current();
    if (tok.kind !== kind || (value !== undefined && tok.value !== value)) {
      const expected = value !== undefined ? `"${value}"` : kind;
      this.emit(
        "LLN-PARSE-001",
        "UNEXPECTED_TOKEN",
        `Expected ${expected}, got "${tok.value}" (${tok.kind}).`,
        this.loc(),
      );
      return undefined;
    }
    this.advance();
    return tok;
  }
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Parses a LogicN source file.
 *
 * @param source  Full source text of the .lln file.
 * @param file    File path used in diagnostic locations.
 * @returns       ParseResult containing the AST, diagnostics, and flow metadata.
 */
export function parseProgram(source: string, file: string): ParseResult {
  const lexResult = lex(source, file);

  // Convert lexer diagnostics to parser diagnostics (structurally compatible)
  const lexDiagnostics: ParseDiagnostic[] = lexResult.diagnostics.map((d: LexerDiagnostic) => ({
    code: d.code,
    name: d.name,
    severity: d.severity,
    message: d.message,
    ...(d.location !== undefined ? { location: d.location } : {}),
    ...(d.suggestedFix !== undefined ? { suggestedFix: d.suggestedFix } : {}),
  }));

  // Filter out newline tokens for simpler parsing (tracked via line numbers)
  const tokens = lexResult.tokens;
  const parser = new Parser(tokens, file);
  const result = parser.parse();

  return {
    ast: result.ast,
    diagnostics: [...lexDiagnostics, ...result.diagnostics],
    flows: result.flows,
  };
}
