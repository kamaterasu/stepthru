import { traceArray } from "../src/index";

/** The code shown with the figure. Line numbers passed to `t.at` refer to it. */
export const bubbleSortCode = `for (let i = 0; i < a.length; i++) {
  for (let j = 0; j < a.length - i - 1; j++) {
    if (a[j] > a[j + 1]) {
      [a[j], a[j + 1]] = [a[j + 1], a[j]];
    }
  }
  // a[a.length - i - 1] is in its final place
}`;

export function bubbleSort(values: number[]) {
  const t = traceArray(values, "Bubble sort: unsorted input");
  for (let i = 0; i < t.length; i++) {
    for (let j = 0; j < t.length - i - 1; j++) {
      t.watch({ i, j });
      t.at(3);
      if (t.compare(j, j + 1) > 0) {
        t.at(4);
        t.swap(j, j + 1);
      }
    }
    t.watch({ j: undefined });
    t.at(7);
    t.mark(t.length - i - 1, "sorted");
  }
  return t;
}
