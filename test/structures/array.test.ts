// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { arrayView, heapView, traceArray, type ArrayState, type ArrayTrace } from "../../src/structures/array";

const lastStep = <T>(t: ArrayTrace<T>) => t.steps[t.steps.length - 1];

describe("traceArray", () => {
  test("starts with the input and does not change it", () => {
    const input = [3, 1, 2];
    const t = traceArray(input, "start");
    t.swap(0, 1);
    expect(input).toEqual([3, 1, 2]);
    expect(t.length).toBe(3);
    expect(t.steps[0]).toMatchObject({ op: "init", caption: "start", state: { values: [3, 1, 2], active: [] } });
    expect(t.view).toBe(arrayView);
  });

  test("rejects an empty array", () => {
    expect(() => traceArray([])).toThrow(RangeError);
  });

  test("rejects indexes outside the array", () => {
    const t = traceArray([1, 2]);
    expect(() => t.get(2)).toThrow(RangeError);
    expect(() => t.compare(-1, 0)).toThrow(RangeError);
    expect(() => t.pointer("p", 1.5)).toThrow(RangeError);
    expect(t.steps).toHaveLength(1);
  });

  test("get reads without recording", () => {
    const t = traceArray([4, 5]);
    expect(t.get(1)).toBe(5);
    expect(t.steps).toHaveLength(1);
  });

  test("compare returns the difference and highlights both cells", () => {
    const t = traceArray([5, 2]);
    expect(t.compare(0, 1)).toBe(3);
    expect(t.compare(1, 0)).toBeLessThan(0);
    expect(lastStep(t)).toMatchObject({ op: "compare", caption: "Compare 2 and 5", state: { active: [1, 0] } });
  });

  test("swap exchanges values", () => {
    const t = traceArray([5, 2]);
    t.swap(0, 1);
    expect(lastStep(t)).toMatchObject({ op: "swap", caption: "Swap 5 and 2", state: { values: [2, 5], active: [], moved: [0, 1] } });
    t.compare(0, 1);
    expect(lastStep(t).state).toMatchObject({ active: [0, 1], moved: [] });
  });

  test("range rejects lo above hi", () => {
    expect(() => traceArray([1, 2, 3, 4]).range("r", 3, 1)).toThrow(RangeError);
  });

  test("mark, pointer, range and clear update state", () => {
    const t = traceArray([1, 2, 3]);
    t.mark(2, "sorted");
    t.pointer("mid", 1);
    t.range("search", 0, 1);
    expect(lastStep(t).state).toMatchObject({ marks: { 2: "sorted" }, pointers: { mid: 1 }, ranges: { search: [0, 1] } });
    t.clear("mid");
    t.clear("search");
    expect(lastStep(t).state).toMatchObject({ pointers: {}, ranges: {}, active: [] });
    expect(t.steps.map((s) => s.caption).slice(1)).toEqual([
      "3 is sorted",
      "mid at index 1",
      "search: indexes 0 to 1",
      "Clear mid",
      "Clear search",
    ]);
  });

  test("custom captions replace the defaults", () => {
    const t = traceArray([1, 2]);
    t.swap(0, 1, "my caption");
    expect(lastStep(t).caption).toBe("my caption");
  });

  test("note keeps the current highlight", () => {
    const t = traceArray([1, 2]);
    t.compare(0, 1);
    t.note("look here");
    expect(lastStep(t)).toMatchObject({ op: "note", caption: "look here", state: { active: [0, 1] } });
  });

  test("note after a swap keeps the moved cells", () => {
    const t = traceArray([2, 1]);
    t.swap(0, 1);
    t.note("look here");
    expect(lastStep(t).state).toMatchObject({ active: [], moved: [0, 1] });
  });
});

describe("traceArray values and buffers", () => {
  test("compares strings in their natural order", () => {
    const t = traceArray(["pear", "apple"], "words");
    expect(t.steps[0].caption).toBe("words");
    expect(t.compare(0, 1)).toBeGreaterThan(0);
    expect(lastStep(t).caption).toBe("Compare pear and apple");
  });

  test("objects need a comparator and can have a label", () => {
    const people = [{ name: "Bo", age: 30 }, { name: "Al", age: 25 }];
    expect(() => traceArray(people).compare(0, 1)).toThrow(TypeError);
    const t = traceArray(people, { compare: (a, b) => a.age - b.age, label: (p) => p.name });
    expect(t.compare(0, 1)).toBe(5);
    t.swap(0, 1);
    expect(lastStep(t).caption).toBe("Swap Bo and Al");
    expect(t.view!(lastStep(t).state)).toContain(">Al</text>");
  });

  test("set writes a value and marks the cell moved", () => {
    const t = traceArray([1, 2]);
    t.set(1, 9);
    expect(lastStep(t)).toMatchObject({ op: "set", caption: "Set index 1 to 9", state: { values: [1, 9], moved: [1] } });
  });

  test("list shows values under the array until cleared", () => {
    const t = traceArray([3, 1]);
    t.list("merged", [1]);
    expect(lastStep(t).state.list).toEqual({ name: "merged", items: [1] });
    expect(t.view!(lastStep(t).state)).toContain("merged: 1");
    t.clear("merged");
    expect(lastStep(t).state.list).toBeNull();
  });

  test("ids follow values through swaps, so views can slide them", () => {
    const t = traceArray([7, 8, 9]);
    t.swap(0, 2);
    expect(lastStep(t).state.ids).toEqual([2, 1, 0]);
    expect(t.view!(lastStep(t).state)).toContain('<g data-key="2" transform="translate(0 24)">');
  });
});

describe("arrayView", () => {
  const state = (over: Partial<ArrayState> = {}): ArrayState => {
    const values = over.values ?? [1, 2, 3];
    return {
      values,
      ids: values.map((_, i) => i),
      active: [],
      moved: [],
      marks: {},
      pointers: {},
      ranges: {},
      list: null,
      ...over,
    };
  };
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const cellStates = (svg: Element) => [...svg.querySelectorAll("rect")].map((r) => r.getAttribute("data-state"));

  test("draws one cell per value with its number", () => {
    const svg = parse(arrayView(state()));
    expect(svg.querySelectorAll("rect")).toHaveLength(3);
    expect([...svg.querySelectorAll("rect + text")].map((t) => t.textContent)).toEqual(["1", "2", "3"]);
    expect(svg.getAttribute("viewBox")).toBe("0 0 128 100");
  });

  test("widens every cell to fit the longest value", () => {
    const svg = parse(arrayView(state({ values: [1, -123456] })));
    const widths = [...svg.querySelectorAll("rect")].map((r) => Number(r.getAttribute("width")));
    expect(widths[0]).toBe(widths[1]);
    expect(widths[0]).toBeGreaterThan(40);
  });

  test("active wins over marked, and the rest are idle", () => {
    const svg = parse(arrayView(state({ active: [0], marks: { 0: "sorted", 1: "sorted" } })));
    expect(cellStates(svg)).toEqual(["active", "marked", "idle"]);
  });

  test("moved cells get their own state", () => {
    const svg = parse(arrayView(state({ moved: [1, 2], active: [2], marks: { 1: "sorted" } })));
    expect(cellStates(svg)).toEqual(["idle", "moved", "moved"]);
  });

  test("dims cells outside every range", () => {
    const svg = parse(arrayView(state({ ranges: { search: [1, 2] } })));
    expect([...svg.querySelectorAll("g g")].map((g) => g.hasAttribute("data-dim"))).toEqual([true, false, false]);
    expect(svg.querySelector(".stepthru-range")).not.toBeNull();
  });

  test("groups pointers that share an index", () => {
    const svg = parse(arrayView(state({ pointers: { lo: 0, mid: 0, hi: 2 } })));
    const labels = [...svg.querySelectorAll("text")].map((t) => t.textContent);
    expect(labels).toContain("lo, mid");
    expect(labels).toContain("hi");
  });

  test("escapes names and lists marks in the label", () => {
    const svg = parse(arrayView(state({ pointers: { "<i>": 0 }, marks: { 1: "found" } })));
    expect([...svg.querySelectorAll("text")].some((t) => t.textContent === "<i>")).toBe(true);
    expect(svg.getAttribute("aria-label")).toBe("Array: 1, 2 (found), 3");
  });
});

describe("heapView", () => {
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

  test("draws the array as a tree of keyed nodes over the array itself", () => {
    const t = traceArray([9, 5, 7, 1]);
    t.range("heap", 0, 2);
    t.swap(0, 2);
    const svg = parse(heapView(lastStep(t).state));
    expect(svg.getAttribute("aria-label")).toMatch(/^Heap: 7, 5, 9, 1/);
    expect(svg.querySelectorAll("line")).toHaveLength(3); // parent links for indexes 1, 2, 3
    const nodes = [...svg.querySelectorAll("g[data-key^='n']")];
    expect(nodes.map((g) => g.textContent)).toEqual(["7", "5", "9", "1"]);
    expect(nodes[0].getAttribute("data-key")).toBe("n2"); // the 7 started at index 2
    expect(nodes[3].hasAttribute("data-dim")).toBe(true); // outside the heap range
    expect(svg.querySelectorAll("rect")).toHaveLength(4); // the array row
  });
});
