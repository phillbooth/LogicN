// =============================================================================
// LogicN Phase 6 — Symbol Resolver
//
// Resolves names after parsing and before type checking.
//
// Implemented diagnostics:
//   LLN-NAME-001  UndeclaredName
//   LLN-NAME-002  DuplicateName
// =============================================================================

import { type AstNode, type SourceLocation } from "./parser.js";

export interface SymbolDiagnostic {
  readonly code: string;
  readonly name: string;
  readonly severity: "error" | "warning";
  readonly message: string;
  readonly location?: SourceLocation;
  readonly suggestedFix?: string;
  readonly suggestedCode?: string;
}

export interface SymbolResolveResult {
  readonly diagnostics: readonly SymbolDiagnostic[];
}

const FLOW_DECL_KINDS = new Set<AstNode["kind"]>([
  "flowDecl",
  "secureFlowDecl",
  "pureFlowDecl",
  "guardedFlowDecl",
]);

const TYPE_DECL_KINDS = new Set<AstNode["kind"]>([
  "typeDecl",
  "enumDecl",
  "recordDecl",
]);

const BINDING_DECL_KINDS = new Set<AstNode["kind"]>([
  "letDecl",
  "mutDecl",
  "readonlyDecl",
]);

const BUILT_IN_VALUE_NAMES = new Set([
  "None",
  "Some",
  "Ok",
  "Err",
  "true",
  "false",
]);

const STANDARD_PRELUDE = new Set([
  "constantTimeEquals",
  "redact",
  "validate",
  "sanitize",
  "json",
  "toml",
  "parse",
  "http",
  "fs",
  "AuditLog",
  "ApiError",
  "Env",
  "File",
  "Money",
  "Response",
]);

class SymbolResolver {
  private readonly diagnostics: SymbolDiagnostic[] = [];
  private readonly scopes: Array<Map<string, AstNode>> = [];

  resolve(ast: AstNode): void {
    this.pushScope();
    this.seedPrelude();
    this.collectTopLevelDeclarations(ast);
    this.walkNode(ast, "normal");
    this.popScope();
  }

  getResult(): SymbolResolveResult {
    return { diagnostics: [...this.diagnostics] };
  }

  private pushScope(): void {
    this.scopes.push(new Map());
  }

  private popScope(): void {
    this.scopes.pop();
  }

  private currentScope(): Map<string, AstNode> {
    const current = this.scopes[this.scopes.length - 1];
    if (current === undefined) {
      const scope = new Map<string, AstNode>();
      this.scopes.push(scope);
      return scope;
    }
    return current;
  }

  private seedPrelude(): void {
    for (const name of [...BUILT_IN_VALUE_NAMES, ...STANDARD_PRELUDE]) {
      this.currentScope().set(name, { kind: "identifier", value: name });
    }
  }

  private collectTopLevelDeclarations(node: AstNode): void {
    if ((FLOW_DECL_KINDS.has(node.kind) || TYPE_DECL_KINDS.has(node.kind)) && node.value !== undefined) {
      this.currentScope().set(node.value.trim(), node);
    }

    for (const child of node.children ?? []) {
      this.collectTopLevelDeclarations(child);
    }
  }

  private lookup(name: string): AstNode | undefined {
    for (let i = this.scopes.length - 1; i >= 0; i--) {
      const found = this.scopes[i]!.get(name);
      if (found !== undefined) return found;
    }
    return undefined;
  }

  private declareInCurrentScope(name: string, node: AstNode): void {
    if (name === "") return;

    const current = this.currentScope();
    if (current.has(name)) {
      this.diagnostics.push({
        code: "LLN-NAME-002",
        name: "DuplicateName",
        severity: "error",
        message: `'${name}' is already declared in this scope.`,
        ...(node.location !== undefined ? { location: node.location } : {}),
        suggestedFix: `Rename this binding or remove the duplicate declaration.`,
      });
      return;
    }

    current.set(name, node);
  }

  private checkIdentifierUse(node: AstNode): void {
    const name = node.value ?? "";
    if (name === "" || name === "<error>" || name === "_") return;
    if (name.includes(":")) return;

    // Capital-letter identifiers are type constructors or stdlib module names.
    // Unknown types are handled by LLN-TYPE-001 in the type checker.
    // Suppress here to avoid noise on stdlib names like UsersDB, FraudModel, etc.
    if (name[0] !== undefined && name[0] >= "A" && name[0] <= "Z") return;

    // Numeric placeholders
    if (/^\d/.test(name)) return;

    if (this.lookup(name) !== undefined) return;

    this.diagnostics.push({
      code: "LLN-NAME-001",
      name: "UndeclaredName",
      severity: "error",
      message: `'${name}' is not declared in the current scope.`,
      ...(node.location !== undefined ? { location: node.location } : {}),
      suggestedFix: `Declare '${name}' before using it, or pass it as a parameter.`,
    });
  }

  private walkNode(node: AstNode, context: "normal" | "type" | "pattern"): void {
    switch (node.kind) {
      case "program":
        this.walkChildren(node, "normal");
        return;

      case "typeRef":
      case "effectRef":
      case "enumVariant":
        return;

      case "paramDecl":
        this.declareInCurrentScope(parseParamName(node.value ?? ""), node);
        return;

      case "flowDecl":
      case "secureFlowDecl":
      case "pureFlowDecl":
      case "guardedFlowDecl":
        this.pushScope();
        for (const child of node.children ?? []) {
          if (child.kind === "paramDecl") this.walkNode(child, "normal");
        }
        for (const child of node.children ?? []) {
          if (child.kind !== "paramDecl") this.walkNode(child, "normal");
        }
        this.popScope();
        return;

      case "block":
        this.pushScope();
        this.walkChildren(node, "normal");
        this.popScope();
        return;

      case "fnDecl":
        this.declareInCurrentScope(node.value ?? "", node);
        this.pushScope();
        this.walkChildren(node, "normal");
        this.popScope();
        return;

      case "letDecl":
      case "mutDecl":
      case "readonlyDecl": {
        // Walk the initializer BEFORE declaring the name to catch use-before-declaration
        const initNode = node.children?.[0];
        if (initNode !== undefined) this.walkNode(initNode, "normal");
        this.declareInCurrentScope(parseBindingName(node.value ?? ""), node);
        // Walk remaining children (type refs etc.) after declaration
        for (const child of (node.children ?? []).slice(1)) {
          this.walkNode(child, "normal");
        }
        return;
      }

      case "matchArm":
        for (const child of node.children ?? []) {
          this.walkNode(child, "normal");
        }
        return;

      case "identifier":
        if (context === "normal") {
          if ((node.children?.length ?? 0) > 0) {
            this.walkChildren(node, "normal");
          } else {
            this.checkIdentifierUse(node);
          }
        }
        return;

      case "callExpr":
        this.checkCallTarget(node);
        this.walkChildren(node, "normal");
        return;

      case "typeDecl":
      case "enumDecl":
      case "recordDecl":
        this.walkChildren(node, "type");
        return;

      default:
        this.walkChildren(node, context);
        return;
    }
  }

  private checkCallTarget(node: AstNode): void {
    const name = node.value ?? "";
    if (name === "" || BUILT_IN_VALUE_NAMES.has(name)) return;

    // Capital-letter call targets are stdlib or user-defined constructors
    if (name[0] !== undefined && name[0] >= "A" && name[0] <= "Z") return;

    if (STANDARD_PRELUDE.has(name) || this.lookup(name) !== undefined) return;

    // Method call on a receiver — receiver check suppresses the call target
    if (isReceiverCall(node)) return;

    this.diagnostics.push({
      code: "LLN-NAME-001",
      name: "UndeclaredName",
      severity: "error",
      message: `'${name}' is not declared in the current scope.`,
      ...(node.location !== undefined ? { location: node.location } : {}),
      suggestedFix: `Declare '${name}' before using it, or import it from a module.`,
    });
  }

  private walkChildren(node: AstNode, context: "normal" | "type" | "pattern"): void {
    for (const child of node.children ?? []) {
      this.walkNode(child, context);
    }
  }
}

function isReceiverCall(node: AstNode): boolean {
  const first = node.children?.[0];
  return first?.kind === "identifier" || first?.kind === "memberExpr" || first?.kind === "callExpr";
}

function parseParamName(value: string): string {
  const colonIdx = value.indexOf(":");
  return (colonIdx === -1 ? value : value.slice(0, colonIdx)).trim();
}

function parseBindingName(value: string): string {
  let rest = value.trim();
  if (rest.startsWith("unsafe ")) rest = rest.slice("unsafe ".length).trim();
  else if (rest.startsWith("safe ")) rest = rest.slice("safe ".length).trim();

  const colonIdx = rest.indexOf(":");
  return (colonIdx === -1 ? rest : rest.slice(0, colonIdx)).trim();
}

export function resolveSymbols(ast: AstNode): SymbolResolveResult {
  const resolver = new SymbolResolver();
  resolver.resolve(ast);
  return resolver.getResult();
}
