import { traceArray } from "../src/index";

/** Top-down merge sort. The merged run is built under the array, then copied back. */
export function mergeSort(values: number[]) {
  const t = traceArray(values, "Merge sort: unsorted input");

  const sort = (lo: number, hi: number) => {
    if (lo >= hi) return;
    const mid = (lo + hi) >> 1;
    sort(lo, mid);
    sort(mid + 1, hi);

    t.range("left", lo, mid, `Merge indexes ${lo} to ${mid}…`);
    t.range("right", mid + 1, hi, `…with indexes ${mid + 1} to ${hi}`);
    const merged: number[] = [];
    let i = lo;
    let j = mid + 1;
    while (i <= mid && j <= hi) {
      t.watch({ i, j });
      merged.push(t.compare(i, j) <= 0 ? t.get(i++) : t.get(j++));
      t.list("merged", merged, `Take ${merged[merged.length - 1]}`);
    }
    // One side ran out; the rest of the other side is already in order.
    while (i <= mid) merged.push(t.get(i++));
    while (j <= hi) merged.push(t.get(j++));
    t.watch({ i: undefined, j: undefined });
    t.list("merged", merged, "Add what is left");
    merged.forEach((v, k) => t.set(lo + k, v, `Copy ${v} back to index ${lo + k}`));
    t.clear("merged", `Indexes ${lo} to ${hi} are merged`);
  };

  sort(0, t.length - 1);
  t.clear("left");
  t.clear("right", "Sorted");
  return t;
}
