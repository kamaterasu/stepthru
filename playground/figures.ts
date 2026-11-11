// Every example figure, shared by the home page and the per-algorithm pages.
import { render, type RenderOptions, type Trace } from "../src/index";
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

export interface Figure {
  /** Also the folder of the figure's own page. */
  slug: string;
  title: string;
  group: string;
  source: string;
  mount(el: HTMLElement): void;
}

// Builds the trace only when mounted, so a page pays for its own figure alone.
const mount = <S>(make: () => Trace<S>, options: RenderOptions<S> = {}) => (el: HTMLElement) => {
  render(make(), el, options);
};

const graph = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"]] as [string, string][],
};
const tree = {
  value: 8,
  left: { value: 3, left: { value: 1 }, right: { value: 6, left: { value: 4 }, right: { value: 7 } } },
  right: { value: 10, right: { value: 14, left: { value: 13 } } },
};

export const FIGURES: Figure[] = [
  { slug: "bubble-sort", title: "Bubble sort", group: "Arrays", source: bubbleSortSource,
    mount: mount(() => bubbleSort([5, 2, 8, 1, 9, 3]), { code: bubbleSortCode }) },
  { slug: "quicksort", title: "Quicksort", group: "Arrays", source: quickSortSource,
    mount: mount(() => quickSort([7, 2, 9, 4, 1, 8, 3])) },
  { slug: "binary-search", title: "Binary search", group: "Arrays", source: binarySearchSource,
    mount: mount(() => binarySearch([1, 3, 5, 7, 9, 11, 13], 9), { code: binarySearchCode }) },
  { slug: "breadth-first-search", title: "Breadth-first search", group: "Graphs", source: bfsSource,
    mount: mount(() => bfs(graph, "A")) },
  { slug: "depth-first-search", title: "Depth-first search", group: "Graphs", source: dfsSource,
    mount: mount(() => dfs(graph, "A")) },
  { slug: "binary-search-tree-insert", title: "Binary search tree: insert", group: "Trees", source: bstSource,
    mount: mount(() => bstInsert([8, 3, 10, 1, 6, 14, 4, 7, 13])) },
  { slug: "in-order-traversal", title: "In-order traversal", group: "Trees", source: bstSource,
    mount: mount(() => inOrder(tree)) },
];
