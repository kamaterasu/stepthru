import { traceArray } from "../src/index";

/** Quicksort with the Lomuto partition: the last value in each range is the pivot. */
export function quickSort(values: number[]) {
  const t = traceArray(values, "Quicksort: unsorted input");

  const sort = (lo: number, hi: number) => {
    if (lo > hi) return;
    if (lo === hi) return t.mark(lo, "sorted");
    t.range("part", lo, hi, `Partition indexes ${lo} to ${hi}`);
    t.pointer("pivot", hi, `Pivot is ${t.get(hi)}`);
    let i = lo;
    for (let j = lo; j < hi; j++) {
      if (t.compare(j, hi) < 0) {
        if (i !== j) t.swap(i, j);
        i++;
      }
    }
    if (i !== hi) t.swap(i, hi, `Move pivot ${t.get(hi)} into place`);
    t.clear("pivot");
    t.mark(i, "sorted");
    sort(lo, i - 1);
    sort(i + 1, hi);
  };

  sort(0, t.length - 1);
  t.clear("part", "Sorted");
  return t;
}
