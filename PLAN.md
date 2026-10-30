# stepthru plan

## Vision

Write the real algorithm once. Call tracer hooks inside it. stepthru records every step and plays it back as an SVG figure that readers can play, pause and scrub, with a caption for each step.

## Scope (v0.1)

Algorithms only. Networking, quantum and other domains come later, and only if a real figure needs them.

## Non-goals

- A general drawing or charting library. Use D3 for that.
- Video or GIF export. Use Manim or Motion Canvas for that.
- A hosted app like VisuAlgo. stepthru is a library you embed.
- Framework bindings (React, Vue, Svelte) before v0.1.

## Principles

1. **Trace real code.** The code in the post is the code that drives the figure. Hand-written frame lists drift from the code they claim to show.
2. **Targets decide the API.** Nothing is added unless one of the targets below needs it.
3. **Small and dependency-free core.** Runtime dependencies must be MIT, ISC, BSD or Apache-2.0. CI enforces this (`npm run licenses`).
4. **Accessible by default.** Every step has a text caption. Controls work with the keyboard. Colors work in light and dark themes and do not carry meaning alone.
5. **Static first.** Any step can render to a plain SVG string, so a figure still shows something without JavaScript.

## Targets

v0.1 is done when all four targets render from the public API with no workarounds. The usage code below is a draft. It is the contract the API gets built toward, and it can change while building.

### 1. Sorting (bubble sort, then quicksort)

Tests: array view, compare, swap, pointers.

```ts
const t = traceArray([5, 2, 8, 1, 9]);
for (let i = 0; i < t.length; i++) {
  for (let j = 0; j < t.length - i - 1; j++) {
    if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
  }
  t.mark(t.length - i - 1, "sorted");
}
render(t, el);
```

### 2. Binary search

Tests: ranges, named pointers, captions.

```ts
const t = traceArray([1, 3, 5, 7, 9, 11, 13]);
let lo = 0, hi = t.length - 1;
while (lo <= hi) {
  const mid = (lo + hi) >> 1;
  t.range("search", lo, hi);
  t.pointer("mid", mid);
  if (t.get(mid) === target) { t.note(`found ${target} at ${mid}`); break; }
  if (t.get(mid) < target) lo = mid + 1; else hi = mid - 1;
}
render(t, el);
```

### 3. Graph BFS and DFS

Tests: graph view, node and edge states, queue and stack views. Dijkstra needs weighted edges and comes after v0.1.

```ts
const t = traceGraph({ nodes: ["A", "B", "C", "D", "E"], edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "E"]] });
const q = t.queue(["A"]);
t.visit("A");
while (q.length) {
  const u = q.shift();
  for (const v of t.neighbors(u)) {
    if (!t.visited(v)) { t.visit(v); t.edge(u, v, "tree"); q.push(v); }
  }
}
render(t, el);
```

### 4. Binary search tree (insert, then in-order traversal)

Tests: tree layout, growing structures, recursion. The author writes the BST logic; the tracer only records it.

```ts
const t = traceTree();
for (const x of [8, 3, 10, 1, 6, 14]) {
  if (t.root === null) { t.addRoot(x); continue; }
  let id = t.root;
  for (;;) {
    const side = t.compare(x, id) < 0 ? "left" : "right";
    const next = t.child(id, side);
    if (next === null) { t.addChild(id, side, x); break; }
    id = next;
  }
}
render(t, el);
```

## Architecture (draft)

- **Tracer:** wraps a data structure. Each hook call records a step: an operation plus a snapshot or diff of the state.
- **Views:** turn one state into SVG. One view per structure: array, graph, tree, queue.
- **Player:** steps through the recorded list. Play, pause, step, scrub, captions and keyboard controls.
- **Theme:** CSS custom properties, so the host page controls colors and fonts.

## Phases

| # | Phase | Done when |
|---|-------|-----------|
| 0 | Plan | This file is agreed. |
| 1 | Repo setup | Typecheck, test, build and license check pass in CI. The playground runs. |
| 2 | Core: tracer, player, theme, static SVG | A trace with captions plays and scrubs in the playground, using a placeholder view. |
| 3 | Array view | Targets 1 and 2 render. |
| 4 | Graph view | Target 3 renders. |
| 5 | Tree view | Target 4 renders. |
| 6 | Real-world test | One tuugu.dev post uses stepthru with no workarounds. |
| 7 | Publish | Docs page, npm `0.1.0`. |

Phases 0 to 6 are done. Phase 7: README and demo page done, npm `0.1.0` published by the author.

## Open questions

- **Graph layout:** write a simple layout, or use `d3-force` (ISC)? Decide in phase 4.
- **npm name:** publish an empty `0.0.0` to reserve `stepthru`.

## Decisions

- **Phase 2:** steps jump with no animation. Add transitions only when a target needs them.
- **Phase 3:** one tracer per structure (`traceArray`, later `traceGraph`, `traceTree`) in place of `trace(array(...))`. Each tracer carries its view, so `render(t, el)` needs no view argument.
- **Phase 3:** the target algorithms live in `examples/`. The playground shows them and `test/examples/targets.test.ts` checks they end in the right state.
- **Phase 4:** graphs are undirected and unweighted. Nodes sit in rows by distance from the first node. `shift`, `pop` and `focus` set the current node; `visit` only marks a node visited.
- **Phase 6:** first real use (a draft tuugu.dev post) found three gaps, now fixed: theme defaults moved to `:where(:root)` so a host can map `--stepthru-*` to its own tokens (the blog switches themes with `data-theme`, not the OS setting); `Trace.view` became a method so mixed figures fit one `Trace<unknown>` registry; SVGs carry their natural `width`/`height` and only shrink, so a small graph no longer scales up to the full column.
- **Phase 5:** trees are binary with numeric ids. The draft `t.insert(x, chooseSide)` hid the algorithm inside the tracer, so it became `compare`, `child`, `addRoot` and `addChild`. Nodes sit in in-order columns, so subtrees never overlap, but nodes shift sideways as the tree grows.
- **Phase 5:** node circles, edge lines, the box row under a figure and the outer `<svg>` frame are shared in `src/structures/svg.ts`.
- **Phase 2:** every step stores a full snapshot (`structuredClone`). Switch to diffs only if long traces get slow.

## After v0.1

Ideas, in no order. Each waits for a real post that needs it.

- Weighted and directed graphs, for Dijkstra.
- Transitions between steps.
- String and object values in arrays.
- A real graph layout for graphs that are not tree-like.
