import { render, type Trace } from "../src/index";
import "../src/styles/theme.css";
import { bfs } from "../examples/bfs";
import { binarySearch } from "../examples/binary-search";
import { bstInsert, inOrder } from "../examples/bst";
import { bubbleSort } from "../examples/bubble-sort";
import { dfs } from "../examples/dfs";
import { quickSort } from "../examples/quicksort";

const app = document.querySelector("#app")!;

function show<S>(title: string, trace: Trace<S>) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  const figure = document.createElement("div");
  app.append(heading, figure);
  render(trace, figure);
}

const graph = {
  nodes: ["A", "B", "C", "D", "E", "F"],
  edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"]] as [string, string][],
};

show("Bubble sort", bubbleSort([5, 2, 8, 1, 9, 3]));
show("Quicksort", quickSort([7, 2, 9, 4, 1, 8, 3]));
show("Binary search (found)", binarySearch([1, 3, 5, 7, 9, 11, 13], 9));
show("Binary search (missing)", binarySearch([1, 3, 5, 7, 9, 11, 13], 4));
show("Breadth-first search", bfs(graph, "A"));
show("Depth-first search", dfs(graph, "A"));
show("Binary search tree: insert", bstInsert([8, 3, 10, 1, 6, 14, 4, 7, 13]));
show(
  "In-order traversal",
  inOrder({
    value: 8,
    left: { value: 3, left: { value: 1 }, right: { value: 6, left: { value: 4 }, right: { value: 7 } } },
    right: { value: 10, right: { value: 14, left: { value: 13 } } },
  }),
);
