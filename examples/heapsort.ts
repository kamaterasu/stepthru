import { traceArray } from "../src/index";

/** Heapsort: build a max-heap in place, then move the largest value to the end one at a time. Draw it with `heapView`. */
export function heapSort(values: number[]) {
  const t = traceArray(values, "Heapsort: unsorted input");
  const n = t.length;

  // Moves the value at i down until it is at least as large as its children, within indexes 0..end.
  const siftDown = (i: number, end: number) => {
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let largest = i;
      if (left <= end && t.compare(left, largest) > 0) largest = left;
      if (right <= end && t.compare(right, largest) > 0) largest = right;
      if (largest === i) return;
      t.swap(i, largest);
      i = largest;
    }
  };

  t.range("heap", 0, n - 1, "Build a max-heap: every parent at least as large as its children");
  for (let i = (n >> 1) - 1; i >= 0; i--) siftDown(i, n - 1);
  for (let end = n - 1; end > 0; end--) {
    t.swap(0, end, `Move the largest, ${t.get(0)}, to the end`);
    t.mark(end, "sorted");
    t.range("heap", 0, end - 1, `The heap shrinks to indexes 0 to ${end - 1}`);
    siftDown(0, end - 1);
  }
  t.mark(0, "sorted");
  t.clear("heap", "Sorted");
  return t;
}
