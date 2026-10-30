// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { traceTree, treeView, type TreeState } from "../../src/structures/tree";

const lastStep = (t: ReturnType<typeof traceTree>) => t.steps[t.steps.length - 1];

describe("traceTree", () => {
  test("starts empty by default", () => {
    const t = traceTree(null, "start");
    expect(t.root).toBeNull();
    expect(t.steps[0]).toMatchObject({ op: "init", caption: "start", state: { nodes: [], root: null, current: null, visited: [] } });
    expect(t.view).toBe(treeView);
  });

  test("starts from a nested literal", () => {
    const t = traceTree({ value: 2, left: { value: 1 }, right: { value: 3, right: null } });
    expect(t.value(t.root!)).toBe(2);
    expect(t.value(t.child(t.root!, "left")!)).toBe(1);
    expect(t.value(t.child(t.root!, "right")!)).toBe(3);
    expect(t.child(t.child(t.root!, "left")!, "left")).toBeNull();
    expect(t.steps).toHaveLength(1);
  });

  test("addRoot only works on an empty tree", () => {
    const t = traceTree();
    const root = t.addRoot(5);
    expect(t.root).toBe(root);
    expect(lastStep(t)).toMatchObject({ op: "add", caption: "5 becomes the root", state: { current: root } });
    expect(() => t.addRoot(6)).toThrow("the tree already has a root");
  });

  test("addChild fills an empty slot and makes the child current", () => {
    const t = traceTree();
    const root = t.addRoot(5);
    const left = t.addChild(root, "left", 3);
    expect(t.child(root, "left")).toBe(left);
    expect(lastStep(t)).toMatchObject({ caption: "Add 3 as the left child of 5", state: { current: left } });
    expect(() => t.addChild(root, "left", 4)).toThrow("already has a left child");
  });

  test("compare returns the difference and makes the node current", () => {
    const t = traceTree({ value: 8 });
    expect(t.compare(3, t.root!)).toBe(-5);
    expect(lastStep(t)).toMatchObject({ op: "compare", caption: "Compare 3 with 8", state: { current: t.root } });
  });

  test("focus and visit", () => {
    const t = traceTree({ value: 1, right: { value: 2 } });
    const right = t.child(t.root!, "right")!;
    t.focus(right);
    expect(lastStep(t)).toMatchObject({ caption: "Go to 2", state: { current: right } });
    t.visit(right);
    t.visit(right);
    expect(lastStep(t)).toMatchObject({ caption: "Visit 2", state: { current: right, visited: [right] } });
  });

  test("rejects unknown node ids", () => {
    const t = traceTree({ value: 1 });
    expect(() => t.value(5)).toThrow(RangeError);
    expect(() => t.focus(-1)).toThrow(RangeError);
    expect(() => t.addChild(0.5, "left", 2)).toThrow(RangeError);
    expect(t.steps).toHaveLength(1);
  });

  test("snapshots are not changed by later adds", () => {
    const t = traceTree();
    t.addRoot(1);
    t.addChild(0, "right", 2);
    expect(t.steps[1].state.nodes).toEqual([{ value: 1, left: null, right: null }]);
  });
});

describe("treeView", () => {
  // 8 with children 3 (child 6) and 10
  const state = (over: Partial<TreeState> = {}): TreeState => ({
    nodes: [
      { value: 8, left: 1, right: 2 },
      { value: 3, left: null, right: 3 },
      { value: 10, left: null, right: null },
      { value: 6, left: null, right: null },
    ],
    root: 0,
    current: null,
    visited: [],
    ...over,
  });
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const circles = (svg: Element) => [...svg.querySelectorAll("circle")];
  const at = (svg: Element, value: string) => {
    const c = circles(svg).find((c) => c.nextElementSibling?.textContent === value)!;
    return [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))];
  };

  test("draws an empty tree", () => {
    const svg = parse(treeView({ nodes: [], root: null, current: null, visited: [] }));
    expect(circles(svg)).toHaveLength(0);
    expect(svg.getAttribute("aria-label")).toBe("Tree: empty");
  });

  test("draws nodes in in-order columns and depth rows, with an edge per child", () => {
    const svg = parse(treeView(state()));
    expect(circles(svg)).toHaveLength(4);
    expect(svg.querySelectorAll("line")).toHaveLength(3);
    const xs = ["3", "6", "8", "10"].map((v) => at(svg, v)[0]);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(at(svg, "8")[1]).toBeLessThan(at(svg, "3")[1]);
    expect(at(svg, "3")[1]).toBe(at(svg, "10")[1]);
    expect(at(svg, "6")[1]).toBeGreaterThan(at(svg, "3")[1]);
  });

  test("current wins over visited, and the rest are idle", () => {
    const svg = parse(treeView(state({ current: 0, visited: [0, 1] })));
    expect(circles(svg).map((c) => c.getAttribute("data-state")).sort()).toEqual(["active", "idle", "idle", "marked"]);
  });

  test("draws the visit order under the tree and in the label", () => {
    const svg = parse(treeView(state({ visited: [1, 3], current: 3 })));
    expect(svg.querySelectorAll("rect")).toHaveLength(2);
    expect(svg.getAttribute("aria-label")).toBe("Tree: 4 nodes; current 6; visited 3, 6");
  });
});
