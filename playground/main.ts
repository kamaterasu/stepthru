import { marked } from "marked";
import "../src/styles/theme.css";
import readme from "../README.md?raw";
import { FIGURES } from "./figures";

const slug = (text: string) => text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: Node[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// Examples, grouped, each linking to its own page.

const examples = document.querySelector("#examples")!;
let group = "";
for (const f of FIGURES) {
  if (f.group !== group) {
    group = f.group;
    examples.append(el("h3", { id: `example-${slug(group)}`, textContent: group }));
  }
  const figure = el("div");
  const details = el("details", {}, el("summary", { textContent: "Full source" }), el("pre", { textContent: f.source }));
  const more = el("p", {}, el("a", { href: `${f.slug}/`, textContent: `${f.title}, step by step: how it works and its cost →` }));
  examples.append(el("h4", { id: `example-${slug(f.title)}`, textContent: f.title }), figure, details, more);
  f.mount(figure);
}

// Guide: the README's user-facing sections, so the site and the README never disagree.
// Its ## headings become h3 under "Guide", and ### become h4.

const start = readme.indexOf("## How it works");
const end = readme.indexOf("## Develop");
marked.use({
  renderer: {
    heading({ tokens, depth, text }) {
      const level = Math.min(depth + 1, 6);
      return `<h${level} id="${slug(text)}">${this.parser.parseInline(tokens)}</h${level}>\n`;
    },
  },
});
document.querySelector(".guide")!.innerHTML =
  `<h2 id="guide">Guide</h2>${marked.parse(readme.slice(start, end), { async: false })}`;

// Contents, built from the h2 and h3 headings, with the section in view marked.

const toc = document.querySelector(".toc")!;
const list = el("ul");
let sub: HTMLUListElement | null = null;
const links = new Map<string, HTMLAnchorElement>();
for (const h of document.querySelectorAll<HTMLElement>("main h2, main h3")) {
  const link = el("a", { href: `#${h.id}`, textContent: h.textContent ?? "" });
  links.set(h.id, link);
  const item = el("li", {}, link);
  if (h.tagName === "H2") {
    sub = el("ul");
    item.append(sub);
    list.append(item);
  } else sub?.append(item);
}
toc.append(list);

const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links.values()) link.removeAttribute("aria-current");
      links.get(entry.target.id)?.setAttribute("aria-current", "location");
    }
  },
  { rootMargin: "0px 0px -75% 0px" },
);
for (const id of links.keys()) spy.observe(document.getElementById(id)!);

// Test coverage: the Pages build puts the report next to the page. Locally there is none, so the link stays hidden.

fetch("coverage/coverage-summary.json")
  .then((r) => (r.ok ? r.json() : null))
  .then((summary: { total: { lines: { pct: number } } } | null) => {
    if (!summary) return;
    const box = document.querySelector<HTMLElement>(".coverage")!;
    box.querySelector("a")!.textContent = `Test coverage ${summary.total.lines.pct}%`;
    box.hidden = false;
  })
  .catch(() => {});

// Copy buttons

document.addEventListener("click", async (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>("[data-copy]");
  if (!button) return;
  await navigator.clipboard.writeText(button.dataset.copy!);
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = "Copy"), 1500);
});
