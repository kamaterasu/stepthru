import { traceGraph, type GraphInput } from "../src/index";

/** Breadth-first search from `start`, marking the edges of the BFS tree. */
export function bfs(graph: GraphInput, start: string) {
  const t = traceGraph(graph, `BFS from ${start}`);
  const q = t.queue([start]);
  t.visit(start);
  while (q.length) {
    const u = q.shift();
    for (const v of t.neighbors(u)) {
      if (!t.visited(v)) {
        t.visit(v);
        t.edge(u, v, "tree");
        q.push(v);
      }
    }
  }
  t.note(`Done: visited ${t.steps[t.steps.length - 1].state.visited.join(", ")}`);
  return t;
}
