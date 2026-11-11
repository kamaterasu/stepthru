import { traceGraph, type GraphInput } from "../src/index";

/** Topological sort with Kahn's algorithm: repeatedly take a node that nothing left points to. */
export function topologicalSort(graph: GraphInput) {
  const t = traceGraph({ ...graph, directed: true }, "Topological sort (Kahn's algorithm)");
  const incoming = new Map(graph.nodes.map((id) => [id, 0]));
  for (const [, v] of graph.edges) incoming.set(v, incoming.get(v)! + 1);
  for (const id of graph.nodes) t.tag(id, incoming.get(id)!, `${id} has ${incoming.get(id)} incoming edges`);

  const q = t.queue(graph.nodes.filter((id) => incoming.get(id) === 0), "Start with the nodes nothing points to");
  const order: string[] = [];
  while (q.length > 0) {
    const u = q.shift();
    order.push(u);
    t.visit(u, `${u} is next in the order: ${order.join(", ")}`);
    for (const v of t.neighbors(u)) {
      incoming.set(v, incoming.get(v)! - 1);
      t.edge(u, v, "done");
      t.tag(v, incoming.get(v)!, `Remove ${u}→${v}: ${v} has ${incoming.get(v)} incoming edges left`);
      if (incoming.get(v) === 0) q.push(v, `Nothing left points to ${v}: queue it`);
    }
  }
  t.note(order.length === graph.nodes.length ? `Order: ${order.join(", ")}` : "A cycle: some nodes can never be taken");
  return t;
}
