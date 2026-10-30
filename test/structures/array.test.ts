// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { arrayView, traceArray, type ArrayState } from "../../src/structures/array";

const lastStep = (t: ReturnType<typeof traceArray>) => t.steps[t.steps.length - 1];

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
    expect(lastStep(t)).toMatchObject({ op: "swap", caption: "Swap 5 and 2", state: { values: [2, 5], active: [0, 1] } });
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
});

describe("arrayView", () => {
  const state = (over: Partial<ArrayState> = {}): ArrayState => ({
    values: [1, 2, 3],
    active: [],
    marks: {},
    pointers: {},
    ranges: {},
    ...over,
  });
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const cellStates = (svg: Element) => [...svg.querySelectorAll("rect")].map((r) => r.getAttribute("data-state"));

  test("draws one cell per value with its number", () => {
    const svg = parse(arrayView(state()));
    expect(svg.querySelectorAll("rect")).toHaveLength(3);
    expect([...svg.querySelectorAll("rect + text")].map((t) => t.textContent)).toEqual(["1", "2", "3"]);
    expect(svg.getAttribute("viewBox")).toBe("0 0 128 100");
  });

  test("active wins over marked, and the rest are idle", () => {
    const svg = parse(arrayView(state({ active: [0], marks: { 0: "sorted", 1: "sorted" } })));
    expect(cellStates(svg)).toEqual(["active", "marked", "idle"]);
  });

  test("dims cells outside every range", () => {
    const svg = parse(arrayView(state({ ranges: { search: [1, 2] } })));
    expect([...svg.querySelectorAll("g")].map((g) => g.hasAttribute("data-dim"))).toEqual([true, false, false]);
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
