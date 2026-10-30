# stepthru

Step-through visualizations of algorithms. Write the real algorithm, call tracer hooks inside it, and stepthru records each step and plays it back as an SVG figure you can play, pause and scrub.

Status: early setup, nothing usable yet. See [PLAN.md](PLAN.md).

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
  styles/    theme.css, shipped as stepthru/theme.css
  index.ts   public API
test/        mirrors src/ (test/core/player.test.ts tests src/core/player.ts)
playground/  local demo page (npm run play)
```

License: MIT
