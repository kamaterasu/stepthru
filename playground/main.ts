import { marked } from "marked";
import { render, type RenderOptions, type Trace } from "../src/index";
import "../src/styles/theme.css";
import { bfs } from "../examples/bfs";
import bfsSource from "../examples/bfs.ts?raw";
import { binarySearch, binarySearchCode } from "../examples/binary-search";
import binarySearchSource from "../examples/binary-search.ts?raw";
import { bstInsert, inOrder } from "../examples/bst";
import bstSource from "../examples/bst.ts?raw";
import { bubbleSort, bubbleSortCode } from "../examples/bubble-sort";
import bubbleSortSource from "../examples/bubble-sort.ts?raw";
import { dfs } from "../examples/dfs";
import dfsSource from "../examples/dfs.ts?raw";
import { quickSort } from "../examples/quicksort";
import quickSortSource from "../examples/quicksort.ts?raw";
import readme from "../README.md?raw";

const slug = (text: string) => text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: Node[]) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

// Examples

const examples = document.querySelector("#examples")!;

function group(title: string) {
  examples.append(el("h3", { id: `example-${slug(title)}`, textContent: title }));
}

function show<S>(title: string, trace: Trace<S>, source: string, options: RenderOptions<S> = {}) {
  const figure = el("div");
  const details = el("details", {}, el("summary", { textContent: "Full source" }), el("pre", { textContent: source }));
  examples.append(el("h4", { id: `example-${slug(title)}`, textContent: title }), figure, details);
  render(trace, figure, options);
}

const graph = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"]] as [string, string][],
};
const tree = {
  value: 8,
  left: { value: 3, left: { value: 1 }, right: { value: 6, left: { value: 4 }, right: { value: 7 } } },
  right: { value: 10, right: { value: 14, left: { value: 13 } } },
};

group("Arrays");
show("Bubble sort", bubbleSort([5, 2, 8, 1, 9, 3]), bubbleSortSource, { code: bubbleSortCode });
show("Quicksort", quickSort([7, 2, 9, 4, 1, 8, 3]), quickSortSource);
show("Binary search", binarySearch([1, 3, 5, 7, 9, 11, 13], 9), binarySearchSource, { code: binarySearchCode });
group("Graphs");
show("Breadth-first search", bfs(graph, "A"), bfsSource);
show("Depth-first search", dfs(graph, "A"), dfsSource);
group("Trees");
show("Binary search tree: insert", bstInsert([8, 3, 10, 1, 6, 14, 4, 7, 13]), bstSource);
show("In-order traversal", inOrder(tree), bstSource);

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

// Copy buttons

document.addEventListener("click", async (e) => {
  const button = (e.target as Element).closest<HTMLButtonElement>("[data-copy]");
  if (!button) return;
  await navigator.clipboard.writeText(button.dataset.copy!);
  button.textContent = "Copied";
  setTimeout(() => (button.textContent = "Copy"), 1500);
});
