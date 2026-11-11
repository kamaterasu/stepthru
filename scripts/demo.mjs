// Builds brand/demo.svg: the README's bubble sort as a looping animated SVG, for places with no JavaScript (GitHub, npm).
// Run with `npm run demo`. It reads dist/, so it builds first.
import { readFileSync, writeFileSync } from "node:fs";
import { escape, traceArray } from "../dist/index.js";

const FRAME_S = 0.7;
const HOLD_LAST = 4; // extra frames to hold the sorted array before looping
const CAPTION_H = 40;

// The same code as the README's first example.
const t = traceArray([5, 2, 8, 1, 9]);
for (let i = 0; i < t.length; i++) {
  for (let j = 0; j < t.length - i - 1; j++) {
    if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
  }
  t.mark(t.length - i - 1, "sorted");
}

const frames = t.steps.map((step) => {
  const svg = t.view(step.state);
  const [, w, h] = /width="([\d.]+)" height="([\d.]+)"/.exec(svg);
  return { inner: svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, ""), w: Number(w), h: Number(h), caption: step.caption };
});
const width = Math.max(...frames.map((f) => f.w)) + 8;
const figH = Math.max(...frames.map((f) => f.h));
const height = figH + CAPTION_H;
const slots = frames.length + HOLD_LAST;
const total = slots * FRAME_S;
const share = (n) => ((n / slots) * 100).toFixed(3);

const groups = frames.map((f, i) => {
  const last = i === frames.length - 1;
  // Each frame shows for its slot; the last one holds a little longer.
  return `<g class="f" style="animation-name:${last ? "hold" : "show"};animation-delay:${(i * FRAME_S).toFixed(2)}s">`
    + `<g transform="translate(${(width - f.w) / 2} 0)">${f.inner}</g>`
    + `<text class="cap" x="${width / 2}" y="${figH + 20}" text-anchor="middle">${escape(f.caption || "Bubble sort")}</text></g>`;
});

const theme = readFileSync(new URL("../src/styles/theme.css", import.meta.url), "utf8");
const css = `${theme}
.f { opacity: 0; animation-duration: ${total}s; animation-iteration-count: infinite; animation-timing-function: step-end; }
g.f:first-of-type { opacity: 1; } /* the first frame, when animations are off */
@keyframes show { 0% { opacity: 1; } ${share(1)}% { opacity: 0; } 100% { opacity: 0; } }
@keyframes hold { 0% { opacity: 1; } ${share(1 + HOLD_LAST)}% { opacity: 0; } 100% { opacity: 0; } }
text { font: 16px system-ui, sans-serif; }
text[font-size="11"] { font-size: 11px; }
.bg { fill: var(--stepthru-bg); stroke: color-mix(in srgb, var(--stepthru-muted) 40%, var(--stepthru-bg)); }
.cap { fill: var(--stepthru-muted); font-size: 14px; }
@media (prefers-reduced-motion: reduce) { .f { animation: none; } }`;

const out = `<svg xmlns="http://www.w3.org/2000/svg" class="stepthru-figure" width="${width * 1.5}" height="${height * 1.5}" viewBox="-4 0 ${width} ${height}" role="img" aria-label="stepthru playing bubble sort on 5, 2, 8, 1, 9">`
  // Its own background, because the image follows the OS theme while the page around it may not.
  + `<style>${css}</style><rect class="bg" x="-4" width="${width}" height="${height}" rx="8"/>${groups.join("")}</svg>\n`;
writeFileSync(new URL("../brand/demo.svg", import.meta.url), out);
console.log(`brand/demo.svg: ${frames.length} steps, ${total.toFixed(1)}s loop, ${(out.length / 1024).toFixed(1)} kB`);
