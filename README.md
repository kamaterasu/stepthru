# stepthru

Step-through visualizations of algorithms. Write the real algorithm, call tracer hooks inside it, and stepthru records each step and plays it back as an SVG figure you can play, pause and scrub.

Status: arrays and graphs work (phase 4). Trees are next. See [PLAN.md](PLAN.md).

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

```sh
npm install
npm run play   # playground
npm test
```

## Layout

```
src/
  core/      trace recorder and player, no DOM
  dom/       renders a trace into the page
  structures/ one file per structure: its tracer and its view (array.ts, graph.ts)
  styles/    theme.css, shipped as stepthru/theme.css
  index.ts   public API
test/        mirrors src/ (test/core/player.test.ts tests src/core/player.ts)
examples/    target algorithms from PLAN.md, used by the playground and tests
playground/  local demo page (npm run play)
```

License: MIT
