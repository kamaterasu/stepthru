// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { gridView, traceGrid, type GridTrace } from "../../src/structures/grid";

const lastStep = <T>(t: GridTrace<T>) => t.steps[t.steps.length - 1];
const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

describe("traceGrid", () => {
  test("starts with a copy of the rows", () => {
    const rows = [[1, 2], [3, 4]];
    const t = traceGrid(rows, "start");
    t.set(0, 0, 9);
    expect(rows[0][0]).toBe(1);
    expect([t.rows, t.cols]).toEqual([2, 2]);
    expect(t.steps[0]).toMatchObject({ caption: "start", state: { cells: [[1, 2], [3, 4]] } });
  });

  test("rejects empty, ragged and mislabeled grids", () => {
    expect(() => traceGrid([])).toThrow(RangeError);
    expect(() => traceGrid([[1, 2], [3]])).toThrow("same length");
    expect(() => traceGrid([[1]], { rowLabels: ["a", "b"] })).toThrow("rowLabels");
  });

  test("rejects cells outside the grid", () => {
    const t = traceGrid([[1, 2]]);
    expect(() => t.get(1, 0)).toThrow(RangeError);
    expect(() => t.look([[0, 2]])).toThrow(RangeError);
    expect(t.steps).toHaveLength(1);
  });

  test("set writes and marks the cell moved; look highlights what a step reads", () => {
    const t = traceGrid<number>([[0, null]]);
    t.look([[0, 0]]);
    expect(lastStep(t)).toMatchObject({ op: "look", caption: "Look at 0", state: { active: [[0, 0]] } });
    t.set(0, 1, 5);
    expect(lastStep(t)).toMatchObject({ caption: "Set 0,1 to 5", state: { cells: [[0, 5]], moved: [[0, 1]], active: [] } });
    expect(t.get(0, 1)).toBe(5);
  });

  test("mark names a cell", () => {
    const t = traceGrid([[1]]);
    t.mark(0, 0, "answer");
    expect(lastStep(t).state.marks).toEqual({ "0,0": "answer" });
  });
});

describe("gridView", () => {
  test("draws a cell per value, blank for null, with labels", () => {
    const t = traceGrid<number>([[1, null]], { rowLabels: ["r"], colLabels: ["a", "b"] });
    const svg = parse(t.view!(t.steps[0].state));
    expect(svg.querySelectorAll("rect")).toHaveLength(2);
    expect([...svg.querySelectorAll("text")].map((x) => x.textContent)).toEqual(["a", "b", "r", "1", ""]);
  });

  test("state priority: written, then read, then wall, then marked", () => {
    const t = traceGrid(["#", ".", ".", "."].map((v) => [v]), { wall: (v) => v === "#" });
    t.mark(2, 0, "path");
    t.look([[1, 0]]);
    const states = [...parse(t.view!(lastStep(t).state)).querySelectorAll("rect")].map((r) => r.getAttribute("data-state"));
    expect(states).toEqual(["wall", "active", "marked", "idle"]);
    t.set(1, 0, "x");
    expect(parse(t.view!(lastStep(t).state)).querySelectorAll("rect")[1].getAttribute("data-state")).toBe("moved");
  });

  test("escapes labels and values", () => {
    const svg = gridView({ cells: [["<b>"]], active: [], moved: [], marks: {}, rowLabels: ["<r>"], colLabels: null });
    expect(svg).toContain("&lt;b&gt;");
    expect(svg).toContain("&lt;r&gt;");
  });
});
