import { traceArray } from "../src/index";

export function bubbleSort(values: number[]) {
  const t = traceArray(values, "Bubble sort: unsorted input");
  for (let i = 0; i < t.length; i++) {
    for (let j = 0; j < t.length - i - 1; j++) {
      if (t.compare(j, j + 1) > 0) t.swap(j, j + 1);
    }
    t.mark(t.length - i - 1, "sorted");
  }
  return t;
}
