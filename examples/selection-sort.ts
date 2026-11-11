import { traceArray } from "../src/index";

/** The code shown with the figure. Line numbers passed to `t.at` refer to it. */
export const selectionSortCode = `for (let i = 0; i < a.length - 1; i++) {
  let min = i;
  for (let j = i + 1; j < a.length; j++) {
    if (a[j] < a[min]) min = j;
  }
  [a[i], a[min]] = [a[min], a[i]];
}`;

export function selectionSort(values: number[]) {
  const t = traceArray(values, "Selection sort: unsorted input");
  for (let i = 0; i < t.length - 1; i++) {
    let min = i;
    t.watch({ i, min });
    t.at(2);
    t.pointer("min", min, `Smallest so far: ${t.get(min)}`);
    for (let j = i + 1; j < t.length; j++) {
      t.watch({ i, j, min });
      t.at(4);
      if (t.compare(j, min) < 0) {
        min = j;
        t.watch({ min });
        t.pointer("min", min, `New smallest: ${t.get(min)}`);
      }
    }
    t.watch({ j: undefined });
    t.at(6);
    if (min !== i) t.swap(i, min, `Move ${t.get(min)} to index ${i}`);
    t.mark(i, "sorted");
  }
  t.watch({ i: undefined, min: undefined });
  t.at(1); // the loop ends here
  t.clear("min");
  t.mark(t.length - 1, "sorted", "The last value is in place too");
  return t;
}
