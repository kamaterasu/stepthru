import { render, type Trace } from "../src/index";
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

const app = document.querySelector("#app")!;

function show<S>(title: string, trace: Trace<S>, source: string, code?: string) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  const figure = document.createElement("div");
  const details = document.createElement("details");
  const summary = document.createElement("summary");
  summary.textContent = "Source";
  const pre = document.createElement("pre");
  pre.textContent = source;
  details.append(summary, pre);
  app.append(heading, figure, details);
  render(trace, figure, { code });
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

show("Bubble sort", bubbleSort([5, 2, 8, 1, 9, 3]), bubbleSortSource, bubbleSortCode);
show("Quicksort", quickSort([7, 2, 9, 4, 1, 8, 3]), quickSortSource);
show("Binary search", binarySearch([1, 3, 5, 7, 9, 11, 13], 9), binarySearchSource, binarySearchCode);
show("Breadth-first search", bfs(graph, "A"), bfsSource);
show("Depth-first search", dfs(graph, "A"), dfsSource);
show("Binary search tree: insert", bstInsert([8, 3, 10, 1, 6, 14, 4, 7, 13]), bstSource);
show("In-order traversal", inOrder(tree), bstSource);
