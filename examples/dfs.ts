import { traceGraph, type GraphInput } from "../src/index";

/** Recursive depth-first search from `start`. The stack shows the call stack. */
export function dfs(graph: GraphInput, start: string) {
  const t = traceGraph(graph, `DFS from ${start}`);
  const calls = t.stack();

  const visit = (u: string) => {
    calls.push(u, `Call dfs(${u})`);
    t.focus(u);
    t.visit(u);
    for (const v of t.neighbors(u)) {
      if (!t.visited(v)) {
        t.edge(u, v, "tree");
        visit(v);
        t.focus(u, `Back in dfs(${u})`);
      }
    }
    calls.pop(`Return from dfs(${u})`);
  };

  visit(start);
  t.note(`Done: visited ${t.steps[t.steps.length - 1].state.visited.join(", ")}`);
  return t;
}
