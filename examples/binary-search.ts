import { traceArray } from "../src/index";

/** The code shown with the figure. Line numbers passed to `t.at` refer to it. */
export const binarySearchCode = `let lo = 0, hi = a.length - 1;
while (lo <= hi) {
  const mid = (lo + hi) >> 1;
  if (a[mid] === target) return mid;
  if (a[mid] < target) lo = mid + 1;
  else hi = mid - 1;
}
return -1;`;

/** Expects `values` sorted in ascending order. */
export function binarySearch(values: number[], target: number) {
  const t = traceArray(values, `Binary search for ${target}`);
  let lo = 0;
  let hi = t.length - 1;
  while (lo <= hi) {
    t.watch({ lo, hi, mid: undefined });
    t.at(2);
    t.range("search", lo, hi, `Search indexes ${lo} to ${hi}`);
    const mid = (lo + hi) >> 1;
    t.watch({ mid });
    t.at(3);
    t.pointer("mid", mid, `Check the middle value: ${t.get(mid)}`);
    if (t.get(mid) === target) {
      t.at(4);
      t.mark(mid, "found", `Found ${target} at index ${mid}`);
      return t;
    }
    if (t.get(mid) < target) lo = mid + 1;
    else hi = mid - 1;
  }
  t.watch({ lo, hi, mid: undefined });
  t.at(8);
  t.clear("search");
  t.clear("mid", `${target} is not in the array`);
  return t;
}
