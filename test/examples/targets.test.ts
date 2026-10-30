// Acceptance tests: the PLAN.md targets run on the public API and end in the right state.
import { describe, expect, test } from "vitest";
import { binarySearch } from "../../examples/binary-search";
import { bubbleSort } from "../../examples/bubble-sort";
import { quickSort } from "../../examples/quicksort";
import type { ArrayTrace } from "../../src/index";

const final = (t: ArrayTrace) => t.steps[t.steps.length - 1];
const inputs = [[5, 2, 8, 1, 9, 3], [1], [2, 1], [3, 3, 1, 3], [1, 2, 3, 4], [4, 3, 2, 1]];

describe.each([
  ["bubbleSort", bubbleSort],
  ["quickSort", quickSort],
])("%s", (_, sort) => {
  test.each(inputs)("sorts %j and marks every cell sorted", (...input) => {
    const { state } = final(sort(input));
    expect(state.values).toEqual([...input].sort((a, b) => a - b));
    expect(Object.keys(state.marks)).toHaveLength(input.length);
    expect(state).toMatchObject({ pointers: {}, ranges: {} });
  });
});

describe("binarySearch", () => {
  const values = [1, 3, 5, 7, 9, 11, 13];

  test.each(values.map((v, i) => [v, i]))("finds %i at index %i", (target, index) => {
    const step = final(binarySearch(values, target));
    expect(step.state.marks).toEqual({ [index]: "found" });
    expect(step.caption).toBe(`Found ${target} at index ${index}`);
  });

  test.each([0, 4, 14])("reports %i as missing and clears the search", (target) => {
    const step = final(binarySearch(values, target));
    expect(step.caption).toBe(`${target} is not in the array`);
    expect(step.state).toMatchObject({ marks: {}, pointers: {}, ranges: {} });
  });
});
