# Changelog

## 0.1.0 (2026-10-30)

First release.

- `createTrace`, `createPlayer` and `render`: record steps, play them with buttons, slider and keyboard, captions announced to screen readers.
- `traceArray`: compare, swap, mark, pointers and ranges.
- `traceGraph`: visit, focus, marked edges, queue and stack.
- `traceTree`: binary trees with compare, add, focus and visit order.
- `stepthru/theme.css`: light and dark defaults, every color overridable with `--stepthru-*` variables.
- Views render plain SVG, so any step can be rendered on the server.
- Works in Node ESM and bundlers; types resolve under `NodeNext` and `Bundler`.
