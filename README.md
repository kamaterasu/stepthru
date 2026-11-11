# <img src="https://raw.githubusercontent.com/kamaterasu/stepthru/main/brand/logo.svg" width="32" height="32" alt=""> stepthru

**Trace the real code. Step through what it does.**

[![npm](https://img.shields.io/npm/v/stepthru)](https://www.npmjs.com/package/stepthru)
[![CI](https://github.com/kamaterasu/stepthru/actions/workflows/ci.yml/badge.svg)](https://github.com/kamaterasu/stepthru/actions/workflows/ci.yml)
[![coverage](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fkamaterasu.github.io%2Fstepthru%2Fcoverage%2Fcoverage-summary.json&query=%24.total.lines.pct&suffix=%25&label=coverage)](https://kamaterasu.github.io/stepthru/coverage/)
[![min+gzip](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fkamaterasu.github.io%2Fstepthru%2Fsize.json&query=%24.gzip&label=min%2Bgzip)](https://kamaterasu.github.io/stepthru/size.json)
![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
[![license](https://img.shields.io/npm/l/stepthru)](LICENSE)

<a href="https://kamaterasu.github.io/stepthru/"><img src="https://raw.githubusercontent.com/kamaterasu/stepthru/main/brand/demo.svg" width="420" alt="A stepthru figure playing bubble sort on 5, 2, 8, 1, 9, with a caption for each step"></a>

Step-through algorithm figures. Write the real algorithm, call tracer hooks inside it, and stepthru records each step and plays it back as an SVG figure that readers can play, pause and scrub, with a caption for every step.

**Demo and examples:** https://kamaterasu.github.io/stepthru/

```sh
npm install stepthru
```

```ts
import { render, traceArray } from "stepthru";
import "stepthru/theme.css";

const t = traceArray([5, 2, 8, 1, 9]);
for (let i = 0; i < t.length; i++) {
  for (let j = 0; j < t.length - i - 1; j++) {
    if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
  }
  t.mark(t.length - i - 1, "sorted");
}
render(t, document.querySelector("#figure")!);
```

No runtime dependencies. Works in any page or framework that can give it a DOM element.

## How it works

1. A **tracer** wraps a data structure. Each hook you call (`compare`, `swap`, `visit`, …) changes the state and records a step: a full copy of the state plus a caption.
2. `render(trace, el)` mounts a **player** into `el`: the figure, the caption, buttons, a slider and a step counter.
3. Each tracer brings its own **view**, which draws one state as SVG.

Every hook writes a default caption ("Compare 5 and 2"). Pass your own as the last argument to any hook. Hooks that only read (`get`, `neighbors`, `child`, …) record nothing.

## Code and variables

Show the code next to the figure, and the variables of each step:

```ts
const code = `for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - i - 1; j++) {
    if (a[j] > a[j + 1]) swap(a, j, j + 1);
  }
}`;

const t = traceArray([5, 2, 8, 1]);
for (let i = 0; i < t.length; i++) {
  for (let j = 0; j < t.length - i - 1; j++) {
    t.watch({ i, j });   // shown with every step from here on
    t.at(3);             // steps from here on highlight line 3 of `code`
    if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
  }
}
render(t, el, { code });
```

`t.at(line)` and `t.watch(vars)` work on every tracer and record no step themselves; they tag the steps recorded after them. Line numbers are 1-based and refer to the `code` string you pass to `render`. `watch` merges with earlier calls; a value of `undefined` hides that variable.

The listing can be a cleaned-up copy of the algorithm, without the tracer calls. Keep a test that checks each tagged line still contains the code it should (see `test/examples/targets.test.ts`), so the two cannot drift apart.

## Arrays

```ts
const t = traceArray([1, 3, 5, 7], "optional first caption");
```

| Hook | Records | What it does |
|---|---|---|
| `t.length`, `t.get(i)` | no | Read |
| `t.compare(i, j)` | yes | Highlights both cells. Returns a negative number, zero or a positive number, like a sort comparator |
| `t.swap(i, j)` | yes | Swaps two values. Moved cells are drawn dashed and slide to their new place |
| `t.set(i, value)` | yes | Writes a value, for example when a merge copies values back |
| `t.mark(i, name)` | yes | Marks a cell, for example `"sorted"` or `"found"` |
| `t.pointer(name, i)` | yes | Draws a named pointer under a cell |
| `t.range(name, lo, hi)` | yes | Draws a bracket over `lo..hi` and dims cells outside every range |
| `t.list(name, items)` | yes | Draws a row of values under the array, such as a merge buffer. One at a time |
| `t.clear(name)` | yes | Removes the pointer, the range and the list called `name` |
| `t.note(caption)` | yes | A step with only a caption |

Values can be numbers, strings or objects. Numbers and strings compare in their natural order. Objects need a comparator, and can have a label for their cell:

```ts
const t = traceArray(people, {
  caption: "Sort by age",
  compare: (a, b) => a.age - b.age,
  label: (p) => p.name,
});
```

An index outside the array throws a `RangeError`.

To draw an array as a binary heap, a tree above the array itself, pass `heapView` as the view. Values slide along both when swapped:

```ts
import { heapView, render } from "stepthru";
render(t, el, { view: (s) => heapView(s) });
```

## Grids

For dynamic programming tables, mazes and anything else laid out in rows and columns.

```ts
const t = traceGrid([[0, 1, 2], [1, null, null]], { rowLabels: ["", "a"], colLabels: ["", "b", "c"] });
const maze = traceGrid(rows, { wall: (v) => v === "#" });
```

| Hook | Records | What it does |
|---|---|---|
| `t.rows`, `t.cols`, `t.get(r, c)` | no | Read. `null` is an empty cell |
| `t.set(r, c, value)` | yes | Writes a value. The cell is drawn dashed |
| `t.look(cells)` | yes | Highlights the cells a step reads, such as the neighbors a DP cell depends on |
| `t.mark(r, c, name)` | yes | Marks a cell, for example `"path"` or `"answer"` |
| `t.note(caption)` | yes | A step with only a caption |

Cells are `[row, col]`, both from 0. Options: `caption`, `rowLabels`, `colLabels`, `label` for a value's text, and `wall` to draw some values as solid walls.

## Graphs

```ts
const t = traceGraph({ nodes: ["A", "B", "C"], edges: [["A", "B"], ["B", "C"]] });
```

| Hook | Records | What it does |
|---|---|---|
| `t.neighbors(id)`, `t.visited(id)`, `t.weight(u, v)` | no | Read. Neighbors come in the order their edges were given. `weight` is 1 for an edge without one |
| `t.visit(id)` | yes | Marks a node visited |
| `t.focus(id)` | yes | Makes a node the current one |
| `t.edge(u, v, mark)` | yes | Marks an edge, for example `"tree"` |
| `t.tag(id, text)` | yes | Draws short text by a node, such as a distance. `null` removes it |
| `t.queue(items?)` | yes | Starts a queue drawn under the graph: `push(id)`, `shift()`, `length` |
| `t.stack(items?)` | yes | Starts a stack drawn under the graph: `push(id)`, `pop()`, `length` |
| `t.note(caption)` | yes | A step with only a caption |

`shift()` and `pop()` make the taken node current.

Edges can have a weight, drawn on the edge, and a graph can be directed, drawn with arrows:

```ts
const roads = traceGraph({ nodes: ["A", "B", "C"], edges: [["A", "B", 4], ["B", "C", 1]] });
const tasks = traceGraph({ nodes: ["wash", "dry", "fold"], edges: [["wash", "dry"], ["dry", "fold"]], directed: true });
```

A directed graph with no cycle is drawn in layers, each node below everything that points to it. Other graphs are drawn in rows by distance from the first node.

## Binary trees

```ts
const t = traceTree();                                    // empty
const u = traceTree({ value: 8, left: { value: 3 } });    // from a literal
```

| Hook | Records | What it does |
|---|---|---|
| `t.root`, `t.value(id)`, `t.child(id, "left")` | no | Read. Ids are numbers, `null` means no node |
| `t.compare(value, id)` | yes | Makes the node current. Returns `value - node.value` |
| `t.addRoot(value)` | yes | Adds the root of an empty tree, returns its id |
| `t.addChild(id, side, value)` | yes | Fills an empty `"left"` or `"right"` slot, returns the new id |
| `t.focus(id)` | yes | Makes a node the current one |
| `t.visit(id)` | yes | Adds the node to the visit order drawn under the tree |
| `t.note(caption)` | yes | A step with only a caption |

## The player

```ts
const player = render(t, el, { intervalMs: 800 });
player.play();
```

`render` returns the player: `seek(i)`, `next()`, `prev()`, `play()`, `pause()`, `toggle()`, `setSpeed(n)`, `state` (`{ index, playing, speed }`) and `destroy()`. Call `destroy()` before removing a figure from the page: it stops playback and removes the figure's listeners.

- Keyboard, once the figure or a control button has focus: ← → step, space plays or pauses, Home and End jump to the first or last step. Each button's tooltip names its key.
- The speed button cycles 0.5×, 1×, 2× and 4×.
- Long code scrolls inside its panel, which keeps the current line in view.
- Shapes a step touches fade in their color, and array cells slide when a swap moves them, unless the reader prefers reduced motion. Your own views can slide shapes too: give a group a `data-key` and place it with `transform="translate(x y)"`.
- Rendering into an element that already holds a figure destroys the old one first.
- Screen readers hear the caption of each step the reader moves to. During playback captions are not announced, so a step every 800 ms does not flood the reader.
- Playback pauses when the figure scrolls out of view.
- The figure keeps the size of its largest step, so it does not jump while a tree or graph grows.
- Nothing plays until the reader presses play.

## Labels

The controls' screen reader text and tooltips are English by default. Translate any of them:

```ts
render(t, el, {
  labels: { first: "Эхний алхам", prev: "Өмнөх алхам", play: "Тоглуулах", pause: "Зогсоох",
            next: "Дараах алхам", last: "Сүүлийн алхам", step: "Алхам", code: "Код", variables: "Хувьсагч", speed: "Хурд" },
});
```

The defaults are exported as `LABELS`.

The captions the tracers write, such as "Compare 5 and 2", can be translated too. Pass `captions` to the tracer; anything you leave out stays English:

```ts
const t = traceArray([5, 2, 8], {
  captions: {
    compare: (a, b) => `${a} ба ${b}-г харьцуулах`,
    swap: (a, b) => `${a} ба ${b}-г солих`,
  },
});
```

Every tracer takes `captions`: `traceArray`, `traceGraph`, `traceTree` and `traceGrid`. The English defaults are exported as `ARRAY_CAPTIONS`, `GRAPH_CAPTIONS`, `TREE_CAPTIONS` and `GRID_CAPTIONS`, and show the arguments each caption gets.

## Theming

`stepthru/theme.css` styles the player and the views. Its colors are CSS variables with defaults for light and dark (from the OS setting). Set them anywhere to match your site:

```css
:root {
  --stepthru-fg: var(--text);
  --stepthru-bg: var(--background);
  --stepthru-muted: var(--border);
  --stepthru-accent: var(--brand);   /* current and highlighted */
  --stepthru-done: var(--success);   /* marked and visited */
}
```

Figures render at their natural size and only shrink on narrow screens. Add `.stepthru-figure svg { width: 100%; }` to scale them up.

## Linking to a step

Give the figure's element an `id` and pass `link: true`. The page URL then follows the step, as `#<id>=<step>`, and opening that URL shows the figure at that step:

```ts
render(t, document.querySelector("#bubble")!, { link: true }); // page.html#bubble=12 opens step 12
```

The URL changes when the reader moves, not during playback, and never adds to the back button's history.

## No build step

stepthru is plain ES modules with no dependencies, so a page can load it from a CDN:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/stepthru@0.4/dist/theme.css" />
<div id="figure"></div>
<script type="module">
  import { traceArray, render } from "https://cdn.jsdelivr.net/npm/stepthru@0.4/dist/index.js";

  const t = traceArray([5, 2, 8, 1, 9]);
  for (let i = 0; i < t.length; i++) {
    for (let j = 0; j < t.length - i - 1; j++) {
      if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
    }
  }
  render(t, document.querySelector("#figure"));
</script>
```

`https://esm.sh/stepthru@0.4` works too.

## Frameworks

`render` takes any element and returns a `destroy()`, so each framework needs only a few lines. Import `stepthru/theme.css` once in your app.

**React**

```tsx
import { useEffect, useRef } from "react";
import { render, type Trace } from "stepthru";

export function Figure<S>({ trace }: { trace: Trace<S> }) {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => render(trace, el.current!).destroy, [trace]);
  return <div ref={el} />;
}
```

Build the trace outside the component, or with `useMemo`, so it is not traced again on every render.

**Vue**

```vue
<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import { render, type RenderedFigure, type Trace } from "stepthru";

const props = defineProps<{ trace: Trace<unknown> }>();
const el = ref<HTMLDivElement>();
let figure: RenderedFigure | undefined;
onMounted(() => (figure = render(props.trace, el.value!)));
onBeforeUnmount(() => figure?.destroy());
</script>

<template><div ref="el" /></template>
```

**Svelte**

```svelte
<script lang="ts">
  import { render, type Trace } from "stepthru";
  export let trace: Trace<unknown>;
  const figure = (el: HTMLElement) => ({ destroy: render(trace, el).destroy });
</script>

<div use:figure></div>
```

**Astro, or any static site**

Render the first step at build time with `toHTML`, so the figure shows without JavaScript, then make it playable in the browser:

```astro
---
import { toHTML } from "stepthru";
import { bubbleSort } from "../algorithms/bubble-sort";
---
<div class="stepthru" id="bubble" set:html={toHTML(bubbleSort([5, 2, 8, 1, 9]))} />
<script>
  import "stepthru/theme.css";
  import { render } from "stepthru";
  import { bubbleSort } from "../algorithms/bubble-sort";
  render(bubbleSort([5, 2, 8, 1, 9]), document.querySelector("#bubble")!);
</script>
```

## Without JavaScript

`toHTML(trace, options)` returns the figure's first step as an HTML string. It needs no DOM, so it runs on the server or at build time. Put it inside an element with class `stepthru`, then call `render` on that element in the browser:

```astro
---
// Astro component: rendered at build time
const t = bubbleSort([5, 2, 8]);
---
<div class="stepthru" data-figure="bubble" set:html={toHTML(t, { code })} />
<script>
  render(bubbleSort([5, 2, 8]), document.querySelector('[data-figure="bubble"]'), { code });
</script>
```

Without JavaScript, readers see the first step, its caption and the code. The controls stay hidden until `render` runs, so there are no buttons that do nothing.

## Your own structures

`createTrace(initial)` gives you `steps` and `record(op, state, caption)`. Pass a view to `render`:

```ts
import { createTrace, render } from "stepthru";

const t = createTrace({ count: 0 }, "Start at zero");
for (let i = 1; i <= 3; i++) t.record("add", { count: i }, `Add one: ${i}`);
render(t, el, { view: (s) => `<svg width="60" height="40"><text x="10" y="25">${s.count}</text></svg>` });
```

Views must escape any text they put into the markup. Use the exported `escape`:

```ts
import { escape } from "stepthru";
const view = (s: { name: string }) => `<svg width="80" height="40"><text x="10" y="25">${escape(s.name)}</text></svg>`;
```

`render` draws every step once at the start to find the largest, so the figure does not jump. For traces with thousands of steps, give the trace a `size(state)` method that returns the `[width, height]` the view would draw, and `render` skips the drawing.

## Develop

See [CONTRIBUTING.md](CONTRIBUTING.md), including how to add an algorithm page.

```sh
npm install
npm run play       # playground with every example
npm run coverage   # tests with a coverage report in coverage/
npm run size       # what stepthru adds to a bundle, minified and gzipped
npm run demo       # rebuild brand/demo.svg, the animated figure in this README
npm run pages      # rebuild the algorithm pages from playground/pages.json
npm test           # unit and acceptance tests
npm run e2e        # the built site in a real browser (first: npx playwright install chromium)
npm run typecheck
npm run build
```

```
src/
  core/        trace recorder and player, no DOM
  dom/         renders a trace into the page
  structures/  one file per structure: its tracer and its view, plus shared SVG shapes (svg.ts)
  styles/      theme.css, shipped as stepthru/theme.css
  index.ts     public API
test/          mirrors src/
examples/      the algorithms on the demo page, also run by the acceptance tests
playground/    the demo page (npm run play, deployed to GitHub Pages)
brand/         logo, one-color logo and social preview image (see BRAND.md)
```

## Releasing

Pushing a `v*` tag runs `.github/workflows/release.yml`: it checks the tag matches `package.json`, publishes to npm with trusted publishing (no npm token), and creates the GitHub release from `CHANGELOG.md`.

1. Add a `## x.y.z (YYYY-MM-DD)` section at the top of `CHANGELOG.md` and commit it.
2. `npm version x.y.z` (or `patch`, `minor`, `major`). It bumps `package.json`, commits and tags `vx.y.z`.
3. `git push --follow-tags`

See [PLAN.md](PLAN.md) for scope, decisions and what comes next.

## License

MIT
