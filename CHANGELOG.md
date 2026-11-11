# Changelog

## 0.5.0 (2026-11-11)

- Fix: in Chromium, highlighted shapes flashed bright yellow for a quarter second on every step. The fade now animates opacity, not color.
- New: translatable captions. Every tracer takes a `captions` option; the English defaults are exported as `ARRAY_CAPTIONS`, `GRAPH_CAPTIONS`, `TREE_CAPTIONS` and `GRID_CAPTIONS`. `traceGraph` and `traceTree` take an options object as their second argument; a string is still the caption.
- New: weighted and directed graphs. Edges take an optional weight, drawn on the edge, and `directed: true` draws arrows. New `t.weight(u, v)` and `t.tag(id, text)` for short text by a node, such as a distance. Directed graphs with no cycle are drawn in layers. `edgeKey` takes a `directed` flag.
- New: `heapView` draws an array as a binary heap, a tree above the array, for heapsort and priority queues.
- New: `link: true` keeps the step in the URL as `#<id>=<step>`, and opening such a link shows that step.
- New: tree nodes, and the edges to their parents, slide as the tree grows.
- Faster: `Trace.size(state)` lets `render` size a trace without drawing every step. Arrays and grids have it: `render` on a 17,000-step array trace went from 1.2 s to 70 ms.
- Rows under a figure, such as a graph's queue, widen to fit long items.
- New examples and pages: heapsort, Dijkstra's algorithm and topological sort.
- Browser tests (Playwright) run in CI against the built site.
- README: using stepthru from a CDN with no build step, and recipes for React, Vue, Svelte and Astro.

## 0.4.1 (2026-11-11)

- Faster and lighter: `render` no longer keeps every step's markup in memory; it draws each step as it is shown. On a 17,000-step trace memory dropped from about 1 GB to 15 MB, and `render` took a third less time.
- `toHTML` draws only the first step instead of every step: 1.9 s to 0.1 ms on the same trace.
- The README size badge comes from our own build (`npm run size`) instead of Bundlephobia, which was rate limited.

## 0.4.0 (2026-11-11)

- New: `traceGrid` for dynamic programming tables and mazes: `set`, `look`, `mark`, row and column labels, and wall cells.
- New: arrays of strings, or of objects with `compare` and `label` options. A string second argument is still the caption.
- New: `t.set(i, value)` writes a value, and `t.list(name, items)` draws a row under the array, such as a merge buffer. `t.clear(name)` also removes the list.
- New: array cells slide to their new place on a swap. Off under `prefers-reduced-motion`. Custom views can slide shapes too, with `data-key` and a `translate`.
- `ArrayState` has `ids` and `list`. `ArrayState`, `ArrayTrace` and `arrayView` take a value type, `number` by default.
- New examples and pages: insertion sort, selection sort, merge sort, edit distance and shortest path in a maze.

## 0.3.0 (2026-11-11)

- New: speed button (0.5×, 1×, 2×, 4×) and `player.setSpeed(n)`. `PlayerState` has `speed`. New `speed` label.
- New: buttons carry `aria-keyshortcuts` and a tooltip naming their key. Arrow keys, Home and End also work while a button has focus.
- New: shapes a step compares or moves fade in their color. Off under `prefers-reduced-motion`.
- Long code scrolls inside its panel (max 24em) and keeps the current line in view without scrolling the page.
- Array cells widen to fit long values such as `-123456`.
- Fix: `render` into an element that already held a figure left the old listeners and timer running.
- `createPlayer` throws a `RangeError` when `intervalMs` is not above 0.
- `t.watch` names the variable it cannot copy, in place of a bare `DataCloneError`.
- New: `escape` is exported, for custom views.
- The docs site links to the test coverage report (`npm run coverage`).
- Fix: watching a BigInt or a value that refers to itself crashed the figure on that step. The variables panel now shows `10n`, `NaN`, `Infinity`, `Map` and `Set` as written, and `[circular]` for cyclic values.
- Fix: a custom view with its own `viewBox` origin, such as `-50 -25 100 50`, was shifted and cut off.
- Fix: moving to a step during playback gave that step only what was left of the interval.
- Graph and tree labels longer than 3 characters shrink to fit their circle.
- `t.range` throws when `lo` is above `hi`. Graphs reject loop edges such as `["a", "a"]`. A queue or stack replaced by a newer one throws when used.
- `render` and `toHTML` throw a clear error for a trace with no steps, and for a step tagged with a line past the end of `code`.

## 0.2.0 (2026-10-30)

- New: `t.at(line)` and `render(t, el, { code })` show the code next to the figure and highlight the line each step came from.
- New: `t.watch({ i, j })` shows variables with each step.
- New: `labels` option to translate the controls' screen reader text and tooltips. Defaults are exported as `LABELS`.
- New: `toHTML(trace, options)` renders the first step as an HTML string with no DOM, for server or build-time rendering. `render` on the same element makes it playable.
- `Step` has optional `line` and `vars`; `Trace` has `at` and `watch`. Custom tracers built with `createTrace` get both.
- Brand: logo, palette, guidelines (`BRAND.md`) and a social preview image.
- The default theme uses the brand palette in place of GitHub's colors. Every pair meets WCAG AA. Sites that set `--stepthru-*` are not affected.
- Fix: the outer stroke of cells at the edge of a figure was cut off.

## 0.1.1 (2026-10-30)

- Fix: on narrow phones the controls row could push the page wider than the screen, and the step counter wrapped. The slider now shrinks to fit.
- Fix: screen readers announced a caption on every step during playback. Captions are now announced only for steps the reader moves to.
- Playback pauses when the figure scrolls out of view.
- New `destroy()` on the value `render` returns: stops playback and removes listeners.
- A figure keeps the size of its largest step, so it no longer jumps while a tree or graph grows.
- Swapped array cells are drawn dashed, so a swap looks different from a compare. `ArrayState` has a new `moved` field.
- Control buttons use matching SVG icons and are styled by the theme.
- README: a "Releasing" section.

## 0.1.0 (2026-10-30)

First release.

- `createTrace`, `createPlayer` and `render`: record steps, play them with buttons, slider and keyboard, captions announced to screen readers.
- `traceArray`: compare, swap, mark, pointers and ranges.
- `traceGraph`: visit, focus, marked edges, queue and stack.
- `traceTree`: binary trees with compare, add, focus and visit order.
- `stepthru/theme.css`: light and dark defaults, every color overridable with `--stepthru-*` variables.
- Views render plain SVG, so any step can be rendered on the server.
- Works in Node ESM and bundlers; types resolve under `NodeNext` and `Bundler`.
