import { describe, expect, test } from "vitest";
import { createTrace } from "./trace";

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
