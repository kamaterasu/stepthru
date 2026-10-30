import { traceArray } from "../src/index";

/** Expects `values` sorted in ascending order. */
export function binarySearch(values: number[], target: number) {
  const t = traceArray(values, `Binary search for ${target}`);
  let lo = 0;
  let hi = t.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    t.range("search", lo, hi, `Search indexes ${lo} to ${hi}`);
    t.pointer("mid", mid, `Check the middle value: ${t.get(mid)}`);
    if (t.get(mid) === target) {
      t.mark(mid, "found", `Found ${target} at index ${mid}`);
      return t;
    }
    if (t.get(mid) < target) lo = mid + 1;
    else hi = mid - 1;
  }
  t.clear("search");
  t.clear("mid", `${target} is not in the array`);
  return t;
}
