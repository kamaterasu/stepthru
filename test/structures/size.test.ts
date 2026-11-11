import { describe, expect, test } from "vitest";
import { svgSize } from "../../src/dom/fit";
import { traceArray } from "../../src/structures/array";
import { traceGrid } from "../../src/structures/grid";
import { mergeSort } from "../../examples/merge-sort";
import { editDistance } from "../../examples/edit-distance";
import { mazePath } from "../../examples/maze";
import type { Trace } from "../../src/core/trace";

// A tracer's size is a shortcut for render; it must match what its view draws, step for step.
const matches = <S>(t: Trace<S>) => {
  for (const step of t.steps) expect(t.size!(step.state)).toEqual(svgSize(t.view!(step.state)));
};

describe("size matches the drawn view", () => {
  test("arrays, including the list row and wide labels", () => {
    matches(mergeSort([5, 2, 8, 1, 9, 3, 7]));
    const t = traceArray(["a", "much longer label"], { label: (v) => v });
    t.list("buffer", ["x", "y", "z", "w", "v", "u", "t"]);
    matches(t);
  });

  test("grids, with and without labels", () => {
    matches(editDistance("horse", "ros"));
    matches(mazePath(["...", "#.#", "..."]));
    matches(traceGrid([[123456, null]]));
  });
});
