import { createTrace, render } from "../src/index";
import "../src/styles/theme.css";

// Placeholder view until the array view lands in phase 3.
interface Bars {
  values: number[];
  active: number[];
  sortedFrom: number;
}

const view = ({ values, active, sortedFrom }: Bars) => {
  const max = Math.max(...values);
  const bars = values.map((v, i) => {
    const h = (v / max) * 80;
    const state = active.includes(i) ? "active" : i >= sortedFrom ? "done" : "idle";
    return `<rect data-state="${state}" x="${i * 12 + 1}" y="${90 - h}" width="10" height="${h}"/>
<text x="${i * 12 + 6}" y="98" font-size="6" text-anchor="middle">${v}</text>`;
  });
  return `<svg viewBox="0 0 ${values.length * 12} 100" role="img" aria-label="Bars: ${values.join(", ")}">${bars.join("")}</svg>`;
};

const s: Bars = { values: [5, 2, 8, 1, 9, 3], active: [], sortedFrom: 6 };
const t = createTrace(s, "Bubble sort: unsorted input");
for (let i = 0; i < s.values.length; i++) {
  for (let j = 0; j < s.values.length - i - 1; j++) {
    s.active = [j, j + 1];
    t.record("compare", s, `Compare ${s.values[j]} and ${s.values[j + 1]}`);
    if (s.values[j] > s.values[j + 1]) {
      [s.values[j], s.values[j + 1]] = [s.values[j + 1], s.values[j]];
      t.record("swap", s, `Swap: ${s.values[j + 1]} moves right`);
    }
  }
  s.active = [];
  s.sortedFrom = s.values.length - i - 1;
  t.record("sorted", s, `${s.values[s.sortedFrom]} is in its final place`);
}

render(t, document.querySelector("#app")!, view);
