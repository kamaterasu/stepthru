import { traceArray } from "../src/index";

/** The code shown with the figure. Line numbers passed to `t.at` refer to it. */
export const insertionSortCode = `for (let i = 1; i < a.length; i++) {
  for (let j = i; j > 0 && a[j - 1] > a[j]; j--) {
    [a[j - 1], a[j]] = [a[j], a[j - 1]];
  }
}`;

export function insertionSort(values: number[]) {
  const t = traceArray(values, "Insertion sort: unsorted input");
  for (let i = 1; i < t.length; i++) {
    t.watch({ i, j: i });
    t.at(1);
    t.range("insert", 0, i, `Insert ${t.get(i)} into the sorted part before it`);
    for (let j = i; j > 0; j--) {
      t.watch({ i, j });
      t.at(2);
      if (t.compare(j - 1, j) <= 0) break;
      t.at(3);
      t.swap(j - 1, j);
    }
  }
  t.watch({ i: undefined, j: undefined });
  t.at(1); // the loop ends here
  t.clear("insert", "Sorted");
  return t;
}
