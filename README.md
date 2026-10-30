# <img src="https://raw.githubusercontent.com/kamaterasu/stepthru/main/brand/logo.svg" width="32" height="32" alt=""> stepthru

**Trace the real code. Step through what it does.**

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

## Arrays

```ts
const t = traceArray([1, 3, 5, 7], "optional first caption");
```

| Hook | Records | What it does |
|---|---|---|
| `t.length`, `t.get(i)` | no | Read |
| `t.compare(i, j)` | yes | Highlights both cells. Returns `a[i] - a[j]` |
| `t.swap(i, j)` | yes | Swaps two values. Moved cells are drawn dashed, so a swap looks different from a compare |
| `t.mark(i, name)` | yes | Marks a cell, for example `"sorted"` or `"found"` |
| `t.pointer(name, i)` | yes | Draws a named pointer under a cell |
| `t.range(name, lo, hi)` | yes | Draws a bracket over `lo..hi` and dims cells outside every range |
| `t.clear(name)` | yes | Removes the pointer and the range called `name` |
| `t.note(caption)` | yes | A step with only a caption |

Values are numbers. An index outside the array throws a `RangeError`.

## Graphs

```ts
const t = traceGraph({ nodes: ["A", "B", "C"], edges: [["A", "B"], ["B", "C"]] });
```

| Hook | Records | What it does |
|---|---|---|
| `t.neighbors(id)`, `t.visited(id)` | no | Read. Neighbors come in the order their edges were given |
| `t.visit(id)` | yes | Marks a node visited |
| `t.focus(id)` | yes | Makes a node the current one |
| `t.edge(u, v, mark)` | yes | Marks an edge, for example `"tree"` |
| `t.queue(items?)` | yes | Starts a queue drawn under the graph: `push(id)`, `shift()`, `length` |
| `t.stack(items?)` | yes | Starts a stack drawn under the graph: `push(id)`, `pop()`, `length` |
| `t.note(caption)` | yes | A step with only a caption |

`shift()` and `pop()` make the taken node current. Graphs are undirected and unweighted. Nodes are drawn in rows by distance from the first node.

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

`render` returns the player: `seek(i)`, `next()`, `prev()`, `play()`, `pause()`, `toggle()`, `state` (`{ index, playing }`) and `destroy()`. Call `destroy()` before removing a figure from the page: it stops playback and removes the figure's listeners.

- Keyboard, once the figure has focus: ← → step, space plays or pauses, Home and End jump to the first or last step.
- Screen readers hear the caption of each step the reader moves to. During playback captions are not announced, so a step every 800 ms does not flood the reader.
- Playback pauses when the figure scrolls out of view.
- The figure keeps the size of its largest step, so it does not jump while a tree or graph grows.
- Nothing plays until the reader presses play.

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

## Without JavaScript

A view is a plain function from state to SVG markup, so you can render any step on the server or at build time:

```ts
const t = bubbleSort([5, 2, 8]);
const html = t.view!(t.steps[0].state);   // a static <svg>
```

`render` replaces the element's content, so put that static SVG in the element and the figure upgrades when the script runs.

## Your own structures

`createTrace(initial)` gives you `steps` and `record(op, state, caption)`. Pass a view to `render`:

```ts
import { createTrace, render } from "stepthru";

const t = createTrace({ count: 0 }, "Start at zero");
for (let i = 1; i <= 3; i++) t.record("add", { count: i }, `Add one: ${i}`);
render(t, el, { view: (s) => `<svg width="60" height="40"><text x="10" y="25">${s.count}</text></svg>` });
```

Views must escape any text they put into the markup.

## Develop

```sh
npm install
npm run play       # playground with every example
npm test           # unit and acceptance tests
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
