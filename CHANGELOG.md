# Changelog

## Unreleased

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
