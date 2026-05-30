import { createServer } from "node:http";
import { executeFlow, type LogicNValue } from "./interpreter.js";
import { type AstNode, type FlowMeta } from "./parser.js";
import { buildRouteRegistry, type RouteMatch, type RouteRegistry } from "./route-registry.js";

export interface ServerConfig {
  readonly port: number;
  readonly host?: string;
  readonly maxBodyBytes?: number;
  readonly mode?: "dev" | "production" | "deterministic";
}

export interface RunningServer {
  close(): Promise<void>;
  readonly port: number;
  readonly registry: RouteRegistry;
}

export function makeResponseValue(status: number, body: LogicNValue): LogicNValue {
  const fields = new Map<string, LogicNValue>([
    ["__httpStatus", { __tag: "int", value: status }],
    ["__body", body],
    ["__isResponse", { __tag: "bool", value: true }],
  ]);
  return { __tag: "record", fields };
}

export function makeApiErrorValue(status: number, message: string): LogicNValue {
  const fields = new Map<string, LogicNValue>([
    ["__httpStatus", { __tag: "int", value: status }],
    ["__message", { __tag: "string", value: message }],
    ["__isApiError", { __tag: "bool", value: true }],
  ]);
  return { __tag: "record", fields };
}

export function startServer(
  ast: AstNode,
  flows: readonly FlowMeta[],
  config: ServerConfig = { port: 3000 },
): Promise<RunningServer> {
  const registry = buildRouteRegistry(ast);
  const maxBodyBytes = config.maxBodyBytes ?? 1_048_576;

  const server = createServer((req: any, res: any) => {
    const url = req.url ?? "/";
    const method = req.method?.toUpperCase() ?? "GET";
    const queryParams = parseQueryString(url);
    const path = url.split("?")[0] ?? "/";

    const match = registry.match(method, path);
    if (match === null) {
      const pathExists = registry.routes.some((route) => route.pathPattern.test(path));
      res.setHeader("Content-Type", "application/json");
      if (pathExists) {
        res.statusCode = 405;
        res.end(JSON.stringify({ error: "Method Not Allowed" }));
      } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ error: "Not Found", path }));
      }
      return;
    }

    const chunks: Uint8Array[] = [];
    let bodySize = 0;
    let settled = false;

    req.on("data", (chunk: Uint8Array) => {
      if (settled) return;
      bodySize += chunk.length;
      if (bodySize > maxBodyBytes) {
        settled = true;
        res.statusCode = 413;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Request body too large" }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      if (settled) return;
      const body = concatBytes(chunks);
      const reqValue = hydrateRequest(req, match, body, queryParams, path);
      const args = new Map<string, LogicNValue>([["req", reqValue]]);

      try {
        const execution = executeFlow(match.route.flowName, args, ast, flows);
        serializeResponse(execution.value, res);
      } catch (error: unknown) {
        res.statusCode = 500;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({
          error: "Flow execution failed",
          detail: error instanceof Error ? error.message : String(error),
        }));
      }
    });

    req.on("error", () => {
      if (settled) return;
      settled = true;
      res.statusCode = 400;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ error: "Bad Request" }));
    });
  });

  return new Promise<RunningServer>((resolve, reject) => {
    server.listen(config.port, config.host ?? "0.0.0.0", () => {
      const address = server.address();
      const actualPort = typeof address === "object" && address !== null ? address.port : config.port;
      resolve({
        close(): Promise<void> {
          return new Promise((closeResolve, closeReject) =>
            server.close((err: unknown) => (err ? closeReject(err) : closeResolve())),
          );
        },
        port: actualPort,
        registry,
      });
    });
    server.on("error", reject);
  });
}

function hydrateRequest(
  req: any,
  match: RouteMatch,
  body: Uint8Array,
  queryParams: ReadonlyMap<string, string>,
  rawPath: string,
): LogicNValue {
  const headers = new Map<string, LogicNValue>();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") headers.set(key, { __tag: "string", value });
  }

  const params = new Map<string, LogicNValue>();
  for (const [key, value] of match.params) params.set(key, { __tag: "string", value });

  const queryMap = new Map<string, LogicNValue>();
  for (const [key, value] of queryParams) queryMap.set(key, { __tag: "string", value });

  const bodyBytes: LogicNValue = { __tag: "bytes", value: new Uint8Array(body) };
  const fields = new Map<string, LogicNValue>([
    ["method", { __tag: "string", value: req.method?.toUpperCase() ?? "GET" }],
    ["path", { __tag: "string", value: rawPath }],
    ["params", { __tag: "record", fields: params }],
    ["query", { __tag: "record", fields: queryMap }],
    ["headers", { __tag: "record", fields: headers }],
    ["body", bodyBytes],
    ["rawBody", bodyBytes],
  ]);
  return { __tag: "record", fields };
}

function parseQueryString(url: string): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  const qIdx = url.indexOf("?");
  if (qIdx === -1) return map;

  const qs = url.slice(qIdx + 1);
  for (const pair of qs.split("&")) {
    if (pair === "") continue;
    const [rawKey, rawValue] = pair.split("=");
    if (rawKey !== undefined) {
      map.set(decodeURIComponent(rawKey), decodeURIComponent(rawValue ?? ""));
    }
  }
  return map;
}

function serializeResponse(flowResult: LogicNValue, res: any): void {
  res.setHeader("Content-Type", "application/json");

  if (flowResult.__tag === "ok") {
    serializeResponseValue(flowResult.value, res);
    return;
  }
  if (flowResult.__tag === "err") {
    serializeErrorValue(flowResult.error, res);
    return;
  }
  if (flowResult.__tag === "record") {
    serializeResponseValue(flowResult, res);
    return;
  }

  res.statusCode = 500;
  res.end(JSON.stringify({ error: "Internal runtime error", detail: "Unexpected flow result" }));
}

function serializeResponseValue(value: LogicNValue, res: any): void {
  if (value.__tag === "record") {
    const status = value.fields.get("__httpStatus");
    const body = value.fields.get("__body");
    const statusCode = status?.__tag === "int" ? status.value : 200;
    res.statusCode = statusCode;

    if (statusCode === 204 || body === undefined || body.__tag === "void") {
      res.end();
      return;
    }

    if (body.__tag === "string") {
      try {
        JSON.parse(body.value);
        res.end(body.value);
      } catch {
        res.end(JSON.stringify({ value: body.value }));
      }
      return;
    }

    res.end(JSON.stringify(logicNValueToJs(body)));
    return;
  }

  res.statusCode = 200;
  res.end(JSON.stringify(logicNValueToJs(value)));
}

function serializeErrorValue(value: LogicNValue, res: any): void {
  if (value.__tag === "record") {
    const status = value.fields.get("__httpStatus");
    const message = value.fields.get("__message");
    const statusCode = status?.__tag === "int" ? status.value : 500;
    res.statusCode = statusCode;
    res.end(JSON.stringify({
      error: true,
      status: statusCode,
      message: message?.__tag === "string" ? message.value : "Error",
    }));
    return;
  }

  res.statusCode = 500;
  res.end(JSON.stringify({ error: true, status: 500, message: "Unhandled error" }));
}

function logicNValueToJs(value: LogicNValue): unknown {
  switch (value.__tag) {
    case "string": return value.value;
    case "int":
    case "float": return value.value;
    case "bytes": return Array.from(value.value);
    case "bool": return value.value;
    case "void":
    case "none": return null;
    case "some": return logicNValueToJs(value.value);
    case "ok": return logicNValueToJs(value.value);
    case "err": return { error: logicNValueToJs(value.error) };
    case "secure": return "[SECURE]";
    case "protected": return "[PROTECTED]";
    case "redacted": return "[REDACTED]";
    case "list": return value.items.map((item) => logicNValueToJs(item));
    case "record": {
      const out: Record<string, unknown> = {};
      for (const [key, field] of value.fields) {
        if (!key.startsWith("__")) out[key] = logicNValueToJs(field);
      }
      return out;
    }
    default:
      return null;
  }
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }
  const output = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return output;
}
