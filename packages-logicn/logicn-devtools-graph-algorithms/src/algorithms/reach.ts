import { bfsReachable } from "./bfs.js";
import type { Graph, NodeId } from "../core/types.js";

/**
 * Returns true if node `to` is reachable from node `from` via directed edges.
 */
export function canReach<N, E>(graph: Graph<N, E>, from: NodeId, to: NodeId): boolean {
  if (from === to) return graph.hasNode(from);
  return bfsReachable(graph, from).has(to);
}

/**
 * Returns the set of all node IDs reachable from `from` (including `from` itself).
 * Delegates to bfsReachable for consistent traversal semantics.
 */
export function allReachable<N, E>(graph: Graph<N, E>, from: NodeId): Set<NodeId> {
  return bfsReachable(graph, from);
}
