# Changelog

## 0.1.1 (2026-10-30)

- Fix: on phones the controls row overflowed the page sideways (20px at 375px wide). The slider now shrinks to fit.
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
