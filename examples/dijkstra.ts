import { traceGraph, type GraphInput } from "../src/index";

/** Dijkstra's shortest paths from `start`, the simple O(V²) version: always settle the closest unsettled node. Weights must not be negative. */
export function dijkstra(graph: GraphInput, start: string) {
  const t = traceGraph(graph, `Dijkstra's algorithm from ${start}`);
  const dist = new Map(graph.nodes.map((id) => [id, Infinity]));
  const via = new Map<string, string>();
  dist.set(start, 0);
  t.tag(start, 0, `${start} is 0 away from itself. Every other node starts unreached`);

  for (;;) {
    const open = graph.nodes.filter((id) => !t.visited(id) && dist.get(id)! < Infinity);
    if (open.length === 0) break;
    const u = open.reduce((a, b) => (dist.get(b)! < dist.get(a)! ? b : a));
    const d = dist.get(u)!;
    t.focus(u, `The closest unsettled node is ${u}, ${d} away`);
    for (const v of t.neighbors(u)) {
      if (t.visited(v)) continue;
      const through = d + t.weight(u, v);
      const known = dist.get(v)!;
      if (through < known) {
        dist.set(v, through);
        via.set(v, u);
        t.tag(v, through, `Via ${u}, ${v} is ${d} + ${t.weight(u, v)} = ${through} away${known < Infinity ? `, better than ${known}` : ""}`);
      }
    }
    t.visit(u, `${u} is settled: no path to it can be shorter than ${d}`);
  }
  for (const [v, u] of via) t.edge(u, v, "path", `The shortest path to ${v} comes from ${u}`);
  t.note("Done: the marked edges form the shortest-path tree");
  return t;
}
