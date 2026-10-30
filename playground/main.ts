import { render, type ArrayTrace } from "../src/index";
import "../src/styles/theme.css";
import { binarySearch } from "../examples/binary-search";
import { bubbleSort } from "../examples/bubble-sort";
import { quickSort } from "../examples/quicksort";

const demos: [string, ArrayTrace][] = [
  ["Bubble sort", bubbleSort([5, 2, 8, 1, 9, 3])],
  ["Quicksort", quickSort([7, 2, 9, 4, 1, 8, 3])],
  ["Binary search (found)", binarySearch([1, 3, 5, 7, 9, 11, 13], 9)],
  ["Binary search (missing)", binarySearch([1, 3, 5, 7, 9, 11, 13], 4)],
];

const app = document.querySelector("#app")!;
for (const [title, trace] of demos) {
  const heading = document.createElement("h2");
  heading.textContent = title;
  const figure = document.createElement("div");
  app.append(heading, figure);
  render(trace, figure);
}
