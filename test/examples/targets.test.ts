// Acceptance tests: the PLAN.md targets run on the public API and end in the right state.
import { describe, expect, test } from "vitest";
import { bfs } from "../../examples/bfs";
import { bstInsert, inOrder } from "../../examples/bst";
import { binarySearch, binarySearchCode } from "../../examples/binary-search";
import { bubbleSort, bubbleSortCode } from "../../examples/bubble-sort";
import { dfs } from "../../examples/dfs";
import { quickSort } from "../../examples/quicksort";
import { editDistance } from "../../examples/edit-distance";
import { insertionSort, insertionSortCode } from "../../examples/insertion-sort";
import { mazePath } from "../../examples/maze";
import { mergeSort } from "../../examples/merge-sort";
import { selectionSort, selectionSortCode } from "../../examples/selection-sort";
import { edgeKey, type ArrayTrace, type GridTrace, type GraphInput, type GraphTrace, type TreeState, type TreeTrace } from "../../src/index";

const final = <T extends ArrayTrace | GraphTrace | TreeTrace | GridTrace<number | "#"> | GridTrace>(t: T): T["steps"][number] => t.steps[t.steps.length - 1];
const inputs = [[5, 2, 8, 1, 9, 3], [1], [2, 1], [3, 3, 1, 3], [1, 2, 3, 4], [4, 3, 2, 1]];

describe.each([
  ["bubbleSort", bubbleSort],
  ["quickSort", quickSort],
  ["selectionSort", selectionSort],
])("%s", (_, sort) => {
  test.each(inputs)("sorts %j and marks every cell sorted", (...input) => {
    const { state } = final(sort(input));
    expect(state.values).toEqual([...input].sort((a, b) => a - b));
    expect(Object.keys(state.marks)).toHaveLength(input.length);
    expect(state).toMatchObject({ pointers: {}, ranges: {} });
  });
});

describe.each([
  ["insertionSort", insertionSort],
  ["mergeSort", mergeSort],
])("%s", (_, sort) => {
  test.each(inputs)("sorts %j and clears its ranges and list", (...input) => {
    const { state } = final(sort(input));
    expect(state.values).toEqual([...input].sort((a, b) => a - b));
    expect(state).toMatchObject({ pointers: {}, ranges: {}, list: null });
  });
});

describe("mergeSort", () => {
  test("builds the merged run under the array before copying it back", () => {
    const steps = mergeSort([2, 1]).steps;
    expect(steps.find((s) => s.op === "list")!.state.list).toEqual({ name: "merged", items: [1] });
    expect(steps.filter((s) => s.op === "set").map((s) => s.state.values)).toEqual([[1, 1], [1, 2]]);
  });
});

describe("editDistance", () => {
  test.each([["horse", "ros", 3], ["kitten", "sitting", 3], ["abc", "abc", 0], ["", "ab", 2]] as const)(
    "%s to %s is %i, marked as the answer",
    (a, b, distance) => {
      const { state, caption } = final(editDistance(a, b));
      expect(state.cells[a.length][b.length]).toBe(distance);
      expect(state.marks).toEqual({ [`${a.length},${b.length}`]: "answer" });
      expect(caption).toBe(`Edit distance: ${distance}`);
    },
  );
});

describe("mazePath", () => {
  test("finds the shortest path and marks it from exit to start", () => {
    const { state, caption } = final(mazePath(["...", "#.#", "..."]));
    expect(caption).toBe("Shortest path: 4 steps");
    expect(Object.keys(state.marks).sort()).toEqual(["0,0", "0,1", "1,1", "2,1", "2,2"]);
  });

  test("says when the exit cannot be reached", () => {
    expect(final(mazePath([".#", "#."])).caption).toBe("The exit cannot be reached");
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

describe("binary search tree", () => {
  const values = [8, 3, 10, 1, 6, 14, 4, 7, 13];
  // Reads the final tree back as a nested literal, so the shape is easy to compare.
  const shape = (s: TreeState, id = s.root): unknown =>
    id === null ? null : { v: s.nodes[id].value, l: shape(s, s.nodes[id].left), r: shape(s, s.nodes[id].right) };
  const leaf = (v: number) => ({ v, l: null, r: null });

  test("bstInsert builds the expected tree", () => {
    const { state } = final(bstInsert([8, 3, 10, 1, 6, 14]));
    expect(shape(state)).toEqual({
      v: 8,
      l: { v: 3, l: leaf(1), r: leaf(6) },
      r: { v: 10, l: null, r: leaf(14) },
    });
  });

  test("bstInsert sends equal values right", () => {
    expect(shape(final(bstInsert([5, 5])).state)).toEqual({ v: 5, l: null, r: leaf(5) });
  });

  test("bstInsert of nothing leaves an empty tree", () => {
    expect(final(bstInsert([])).state.root).toBeNull();
  });

  test("inOrder visits a BST in sorted order", () => {
    const tree = {
      value: 8,
      left: { value: 3, left: { value: 1 }, right: { value: 6, left: { value: 4 }, right: { value: 7 } } },
      right: { value: 10, right: { value: 14, left: { value: 13 } } },
    };
    const t = inOrder(tree);
    const { state, caption } = final(t);
    expect(state.visited.map((id) => state.nodes[id].value)).toEqual([...values].sort((a, b) => a - b));
    expect(caption).toBe("Done: the visit order is sorted");
  });
});

describe("code lines in the examples", () => {
  // Each op must point at a line that does that thing, so the listing and the traced code cannot drift apart.
  // An op may happen on more than one line, such as a mark inside the loop and one after it.
  const check = (t: ArrayTrace, code: string, expected: Record<string, string | string[]>) => {
    const lines = code.split("\n");
    const tagged = t.steps.filter((s) => s.line !== undefined);
    expect(tagged.length).toBeGreaterThan(0);
    for (const step of tagged) {
      const allowed = [expected[step.op] ?? []].flat();
      expect(allowed.some((text) => lines[step.line! - 1].includes(text)), `${step.op} at line ${step.line}`).toBe(true);
    }
  };

  test("bubble sort", () => {
    check(bubbleSort([3, 1, 2]), bubbleSortCode, { compare: "a[j] > a[j + 1]", swap: "[a[j], a[j + 1]] =", mark: "final place" });
  });

  test.each([[9], [4]])("binary search for %i", (target) => {
    check(binarySearch([1, 3, 5, 7, 9, 11, 13], target), binarySearchCode, {
      range: "while (lo <= hi)",
      pointer: "const mid",
      mark: "a[mid] === target",
      clear: "return -1",
    });
  });

  test("insertion sort", () => {
    check(insertionSort([3, 1, 2]), insertionSortCode, { range: "for (let i = 1", compare: "a[j - 1] > a[j]", swap: "[a[j - 1], a[j]] =", clear: "for (let i = 1" });
  });

  test("selection sort", () => {
    check(selectionSort([3, 1, 2]), selectionSortCode, {
      pointer: "min",
      compare: "a[j] < a[min]",
      swap: "[a[i], a[min]] =",
      mark: ["[a[i], a[min]] =", "for (let i = 0"],
      clear: "for (let i = 0",
    });
  });

  test("bubble sort shows i and j, and hides j once a pass ends", () => {
    const steps = bubbleSort([2, 1]).steps;
    expect(steps.find((s) => s.op === "compare")!.vars).toEqual({ i: 0, j: 0 });
    expect(steps.find((s) => s.op === "mark")!.vars).toEqual({ i: 0, j: undefined });
  });
});
