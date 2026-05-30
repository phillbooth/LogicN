import { describe, it } from "node:test";
import assert from "node:assert/strict";

const { buildEffectGraph } = await import("../dist/graphs/effect-graph.js");
const { buildCallGraph } = await import("../dist/graphs/call-graph.js");
const { topoSort } = await import("../dist/algorithms/topo.js");
const { detectCycle } = await import("../dist/algorithms/dfs.js");

// ─── EffectGraph ───────────────────────────────────────────────────────────

describe("buildEffectGraph", () => {
  const flows = [
    { name: "fetchUser", declaredEffects: ["io.read"], calls: ["logAccess"] },
    { name: "logAccess", declaredEffects: ["io.write"], calls: [] },
    { name: "computeScore", declaredEffects: [], calls: ["fetchUser"] },
  ];

  it("creates a node for every named flow", () => {
    const g = buildEffectGraph(flows);
    assert.ok(g.hasNode("fetchUser"));
    assert.ok(g.hasNode("logAccess"));
    assert.ok(g.hasNode("computeScore"));
  });

  it("node data carries declared effects", () => {
    const g = buildEffectGraph(flows);
    assert.deepEqual(g.node("fetchUser")?.data.declaredEffects, ["io.read"]);
    assert.deepEqual(g.node("logAccess")?.data.declaredEffects, ["io.write"]);
  });

  it("edges reflect the call relationships", () => {
    const g = buildEffectGraph(flows);
    const fetcherOuts = g.outEdges("fetchUser").map((e) => e.to);
    assert.deepEqual(fetcherOuts, ["logAccess"]);

    const scoreOuts = g.outEdges("computeScore").map((e) => e.to);
    assert.deepEqual(scoreOuts, ["fetchUser"]);
  });

  it("edge data has callType 'direct'", () => {
    const g = buildEffectGraph(flows);
    const edge = g.outEdges("fetchUser")[0];
    assert.equal(edge?.data.callType, "direct");
  });

  it("implicitly-referenced callees are added as stub nodes", () => {
    const g = buildEffectGraph([
      { name: "alpha", declaredEffects: [], calls: ["beta"] },
    ]);
    assert.ok(g.hasNode("beta"));
    assert.deepEqual(g.node("beta")?.data.declaredEffects, []);
  });

  it("empty flow list produces an empty graph", () => {
    const g = buildEffectGraph([]);
    assert.equal(g.nodeCount, 0);
    assert.equal(g.edgeCount, 0);
  });
});

// ─── CallGraph ─────────────────────────────────────────────────────────────

describe("buildCallGraph", () => {
  const flows = [
    { name: "main", qualifier: "app", calledFlows: ["authCheck", "renderPage"] },
    { name: "authCheck", qualifier: "auth", calledFlows: ["fetchSession"] },
    { name: "renderPage", qualifier: "ui", calledFlows: [] },
    { name: "fetchSession", qualifier: "auth", calledFlows: [] },
  ];

  it("creates a node for every named flow", () => {
    const g = buildCallGraph(flows);
    assert.equal(g.nodeCount, 4);
    assert.ok(g.hasNode("main"));
    assert.ok(g.hasNode("authCheck"));
  });

  it("node data carries flowName and qualifier", () => {
    const g = buildCallGraph(flows);
    assert.equal(g.node("authCheck")?.data.qualifier, "auth");
    assert.equal(g.node("renderPage")?.data.flowName, "renderPage");
  });

  it("edges represent direct call relationships", () => {
    const g = buildCallGraph(flows);
    const mainOuts = g.outEdges("main").map((e) => e.to).sort();
    assert.deepEqual(mainOuts, ["authCheck", "renderPage"]);
  });

  it("topoSort on CallGraph gives a valid execution order (DAG)", () => {
    // Edges go caller→callee (main→authCheck etc.), so Kahn's places callers
    // before their callees: main < authCheck < fetchSession.
    const g = buildCallGraph(flows);
    const { order, cycle } = topoSort(g);
    assert.equal(cycle, undefined);
    assert.equal(order.length, 4);
    const pos = (id) => order.indexOf(id);
    assert.ok(pos("main") < pos("authCheck"), "main should precede authCheck");
    assert.ok(pos("main") < pos("renderPage"), "main should precede renderPage");
    assert.ok(pos("authCheck") < pos("fetchSession"), "authCheck should precede fetchSession");
  });

  it("detectCycle on a circular call graph returns hasCycle true", () => {
    const circular = [
      { name: "a", qualifier: "m", calledFlows: ["b"] },
      { name: "b", qualifier: "m", calledFlows: ["c"] },
      { name: "c", qualifier: "m", calledFlows: ["a"] },
    ];
    const g = buildCallGraph(circular);
    const result = detectCycle(g);
    assert.equal(result.hasCycle, true);
  });

  it("edge callSite encodes the caller→callee string", () => {
    const g = buildCallGraph(flows);
    const edge = g.outEdges("main").find((e) => e.to === "authCheck");
    assert.equal(edge?.data.callSite, "main->authCheck");
  });
});
