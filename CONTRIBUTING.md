# Contributing

Thanks for helping. Issues and pull requests are welcome.

## Set up

```sh
npm install
npm run play       # the site with every example, live
npm test
npm run typecheck
```

`PLAN.md` holds the principles and the decisions so far. Read its principles before a bigger change: the library traces real code, adds nothing a real figure does not need, and has no runtime dependencies.

## Add an algorithm page

The easiest first contribution. Each page has a live figure, a short explanation and its cost.

1. Write the algorithm in `examples/<name>.ts` with the tracer hooks inside it. Copy the style of `examples/insertion-sort.ts`. If you show the code next to the figure, export it as `<name>Code` and tag steps with `t.at(line)`.
2. Add an acceptance test in `test/examples/targets.test.ts` that checks the final state, such as a sorted array.
3. Add the figure to `BY_SLUG` in `playground/figures.ts`.
4. Add an entry to `playground/pages.json`: `slug`, `title`, `group`, `description` (under 160 characters, for search results), `lead`, `steps`, `facts` and `hooks`. Its place in the file is its place in the site.
5. Run `npm run pages` to write `playground/<slug>/index.html`. Do not edit that file by hand; a test checks it matches `pages.json`.
6. Run `npm run play` and open your page to check it.

The sitemap picks up the new page by itself.

## Change the library

- Keep changes small, and add a test that fails without the change.
- Every step needs a caption that makes sense on its own, and views must escape text with `escape`.
- Colors live in `src/styles/theme.css` as `--stepthru-*` variables. Do not let color carry meaning alone: the dashed outline for moved cells is an example.
- Add a line to `CHANGELOG.md` under `## Unreleased`.

## Pull requests

`npm test`, `npm run typecheck` and `npm run build` must pass. CI runs them on every push.
