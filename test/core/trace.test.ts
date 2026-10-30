import { describe, expect, test } from "vitest";
import { createTrace, type Trace } from "../../src/core/trace";

describe("createTrace", () => {
  test("starts with the initial state as step 0", () => {
    const t = createTrace([3, 1], "start");
    expect(t.steps).toEqual([{ op: "init", state: [3, 1], caption: "start" }]);
  });

  test("records steps in order with an empty caption by default", () => {
    const t = createTrace(0);
    t.record("add", 1);
    t.record("add", 2, "two");
    expect(t.steps.map((s) => [s.op, s.state, s.caption])).toEqual([
      ["init", 0, ""],
      ["add", 1, ""],
      ["add", 2, "two"],
    ]);
  });

  test("snapshots state so later mutation does not change earlier steps", () => {
    const values = [2, 1];
    const t = createTrace(values);
    values.reverse();
    t.record("swap", values);
    expect(t.steps[0].state).toEqual([2, 1]);
    expect(t.steps[1].state).toEqual([1, 2]);
  });
});

describe("Trace typing", () => {
  test("traces of different states fit in one Trace<unknown> registry", () => {
    const registry: Record<string, Trace<unknown>> = {
      numbers: { ...createTrace([1]), view: (s: number[]) => `${s.length}` },
      text: { ...createTrace("a"), view: (s: string) => s },
    };
    expect(Object.keys(registry)).toEqual(["numbers", "text"]);
  });
});

describe("at and watch", () => {
  test("tag later steps with a line and variables, not earlier ones", () => {
    const t = createTrace(0);
    t.at(3);
    t.watch({ i: 1 });
    t.record("a", 1);
    t.watch({ j: 2 });
    t.record("b", 2);
    expect(t.steps.map((s) => [s.line, s.vars])).toEqual([
      [undefined, undefined],
      [3, { i: 1 }],
      [3, { i: 1, j: 2 }],
    ]);
  });

  test("record nothing themselves", () => {
    const t = createTrace(0);
    t.at(1);
    t.watch({ x: 1 });
    expect(t.steps).toHaveLength(1);
  });

  test("watch snapshots values, so later changes do not leak back", () => {
    const t = createTrace(0);
    const list = [1];
    t.watch({ list });
    t.record("a", 1);
    list.push(2);
    expect(t.steps[1].vars).toEqual({ list: [1] });
  });

  test("at rejects lines that are not whole numbers from 1", () => {
    const t = createTrace(0);
    expect(() => t.at(0)).toThrow(RangeError);
    expect(() => t.at(1.5)).toThrow(RangeError);
  });
});
