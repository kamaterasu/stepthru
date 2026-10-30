// Acceptance tests: the PLAN.md targets run on the public API and end in the right state.
import { describe, expect, test } from "vitest";
import { bfs } from "../../examples/bfs";
import { binarySearch } from "../../examples/binary-search";
import { bubbleSort } from "../../examples/bubble-sort";
import { dfs } from "../../examples/dfs";
import { quickSort } from "../../examples/quicksort";
import { edgeKey, type ArrayTrace, type GraphInput, type GraphTrace } from "../../src/index";

const final = <T extends ArrayTrace | GraphTrace>(t: T): T["steps"][number] => t.steps[t.steps.length - 1];
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

describe("graph search", () => {
  const graph: GraphInput = {
    nodes: ["A", "B", "C", "D", "E", "F", "Z"],
    edges: [["A", "B"], ["A", "C"], ["B", "D"], ["C", "D"], ["C", "E"], ["D", "F"]],
  };
  const tree = (...pairs: [string, string][]) => Object.fromEntries(pairs.map(([u, v]) => [edgeKey(u, v), "tree"]));

  test("bfs visits by distance and marks the BFS tree", () => {
    const { state } = final(bfs(graph, "A"));
    expect(state.visited).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(state.edgeMarks).toEqual(tree(["A", "B"], ["A", "C"], ["B", "D"], ["C", "E"], ["D", "F"]));
    expect(state.list).toEqual({ kind: "queue", items: [] });
  });

  test("dfs goes deep first, marks the DFS tree and empties the call stack", () => {
    const { state } = final(dfs(graph, "A"));
    expect(state.visited).toEqual(["A", "B", "D", "C", "E", "F"]);
    expect(state.edgeMarks).toEqual(tree(["A", "B"], ["B", "D"], ["D", "C"], ["C", "E"], ["D", "F"]));
    expect(state.list).toEqual({ kind: "stack", items: [] });
  });

  test.each([["bfs", bfs], ["dfs", dfs]])("%s leaves unreachable nodes alone", (_, search) => {
    expect(final(search(graph, "A")).state.visited).not.toContain("Z");
  });
});
