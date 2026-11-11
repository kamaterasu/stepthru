// Every example figure, shared by the home page and the per-algorithm pages.
import { heapView, render, type RenderOptions, type Trace } from "../src/index";
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
import { editDistance } from "../examples/edit-distance";
import editDistanceSource from "../examples/edit-distance.ts?raw";
import { insertionSort, insertionSortCode } from "../examples/insertion-sort";
import insertionSortSource from "../examples/insertion-sort.ts?raw";
import { mazePath } from "../examples/maze";
import mazeSource from "../examples/maze.ts?raw";
import { mergeSort } from "../examples/merge-sort";
import mergeSortSource from "../examples/merge-sort.ts?raw";
import { selectionSort, selectionSortCode } from "../examples/selection-sort";
import selectionSortSource from "../examples/selection-sort.ts?raw";
import { dijkstra } from "../examples/dijkstra";
import dijkstraSource from "../examples/dijkstra.ts?raw";
import { heapSort } from "../examples/heapsort";
import heapSortSource from "../examples/heapsort.ts?raw";
import { topologicalSort } from "../examples/topological-sort";
import topologicalSortSource from "../examples/topological-sort.ts?raw";
import PAGES from "./pages.json";

export interface Figure {
  /** Also the folder of the figure's own page. */
  slug: string;
  title: string;
  group: string;
  source: string;
  mount(el: HTMLElement): void;
}

// Builds the trace only when mounted, so a page pays for its own figure alone. Elements with an id get step links.
const mount = <S>(make: () => Trace<S>, options: RenderOptions<S> = {}) => (el: HTMLElement) => {
  render(make(), el, { ...options, link: el.id !== "" });
};

const graph = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"]] as [string, string][],
};
const roads = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [["A", "B", 4], ["A", "C", 1], ["C", "B", 2], ["B", "D", 5], ["C", "E", 8], ["D", "E", 3], ["D", "F", 6], ["E", "F", 1]] as [string, string, number][],
};
// Getting dressed: an edge means "put this on first". Short names fit inside the circles.
const clothes = {
  nodes: ["socks", "pants", "shirt", "shoes", "belt", "tie", "coat"],
  edges: [["socks", "shoes"], ["pants", "shoes"], ["pants", "belt"], ["shirt", "belt"], ["shirt", "tie"], ["tie", "coat"], ["belt", "coat"]] as [string, string][],
};
const tree = {
  value: 8,
  left: { value: 3, left: { value: 1 }, right: { value: 6, left: { value: 4 }, right: { value: 7 } } },
  right: { value: 10, right: { value: 14, left: { value: 13 } } },
};

// Each page's figure, by slug. Titles, groups and order come from pages.json.
const BY_SLUG: Record<string, Pick<Figure, "source" | "mount">> = {
  "bubble-sort": { source: bubbleSortSource, mount: mount(() => bubbleSort([5, 2, 8, 1, 9, 3]), { code: bubbleSortCode }) },
  "insertion-sort": { source: insertionSortSource, mount: mount(() => insertionSort([5, 2, 8, 1, 9, 3]), { code: insertionSortCode }) },
  "selection-sort": { source: selectionSortSource, mount: mount(() => selectionSort([5, 2, 8, 1, 9, 3]), { code: selectionSortCode }) },
  "merge-sort": { source: mergeSortSource, mount: mount(() => mergeSort([5, 2, 8, 1, 9, 3, 7])) },
  quicksort: { source: quickSortSource, mount: mount(() => quickSort([7, 2, 9, 4, 1, 8, 3])) },
  heapsort: { source: heapSortSource, mount: mount(() => heapSort([4, 10, 3, 5, 1, 8, 7]), { view: (s) => heapView(s) }) },
  "binary-search": { source: binarySearchSource, mount: mount(() => binarySearch([1, 3, 5, 7, 9, 11, 13], 9), { code: binarySearchCode }) },
  "breadth-first-search": { source: bfsSource, mount: mount(() => bfs(graph, "A")) },
  "depth-first-search": { source: dfsSource, mount: mount(() => dfs(graph, "A")) },
  dijkstra: { source: dijkstraSource, mount: mount(() => dijkstra(roads, "A")) },
  "topological-sort": { source: topologicalSortSource, mount: mount(() => topologicalSort(clothes)) },
  "edit-distance": { source: editDistanceSource, mount: mount(() => editDistance("horse", "ros")) },
  "maze-shortest-path": { source: mazeSource, mount: mount(() => mazePath(["...#.", ".##.#", "...#.", "##...", "...#."])) },
  "binary-search-tree-insert": { source: bstSource, mount: mount(() => bstInsert([8, 3, 10, 1, 6, 14, 4, 7, 13])) },
  "in-order-traversal": { source: bstSource, mount: mount(() => inOrder(tree)) },
};

export const FIGURES: Figure[] = PAGES.map(({ slug, title, group }) => {
  const figure = BY_SLUG[slug];
  if (!figure) throw new Error(`pages.json lists ${slug}, but figures.ts has no figure for it`);
  return { slug, title, group, ...figure };
});
