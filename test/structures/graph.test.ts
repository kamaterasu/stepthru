// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { edgeKey, graphView, traceGraph, type GraphInput, type GraphState } from "../../src/structures/graph";

const input: GraphInput = { nodes: ["A", "B", "C"], edges: [["A", "B"], ["B", "C"]] };
const lastStep = (t: ReturnType<typeof traceGraph>) => t.steps[t.steps.length - 1];

describe("edgeKey", () => {
  test("ignores edge direction", () => {
    expect(edgeKey("A", "B")).toBe(edgeKey("B", "A"));
    expect(edgeKey("A", "B")).not.toBe(edgeKey("A", "C"));
  });
});

describe("traceGraph", () => {
  test("starts with a copy of the input and its view", () => {
    const nodes = ["A"];
    const t = traceGraph({ nodes, edges: [] }, "start");
    nodes.push("Z");
    expect(t.steps[0]).toMatchObject({
      op: "init",
      caption: "start",
      state: { nodes: ["A"], visited: [], current: null, edgeMarks: {}, list: null },
    });
    expect(t.view).toBe(graphView);
  });

  test("rejects bad input", () => {
    expect(() => traceGraph({ nodes: [], edges: [] })).toThrow(RangeError);
    expect(() => traceGraph({ nodes: ["A", "A"], edges: [] })).toThrow("duplicate node A");
    expect(() => traceGraph({ nodes: ["A"], edges: [["A", "Z"]] })).toThrow("unknown node");
    expect(() => traceGraph({ nodes: ["A"], edges: [["A", "A"]] })).toThrow("loop");
  });

  test("rejects unknown nodes and missing edges in hooks", () => {
    const t = traceGraph(input);
    expect(() => t.visit("Z")).toThrow(RangeError);
    expect(() => t.neighbors("Z")).toThrow(RangeError);
    expect(() => t.edge("A", "C", "tree")).toThrow("no edge A-C");
    expect(t.steps).toHaveLength(1);
  });

  test("neighbors and visited read without recording", () => {
    const t = traceGraph(input);
    expect(t.neighbors("B")).toEqual(["A", "C"]);
    expect(t.visited("A")).toBe(false);
    expect(t.steps).toHaveLength(1);
  });

  test("visit records each node once in visit order", () => {
    const t = traceGraph(input);
    t.visit("B");
    t.visit("A");
    t.visit("B");
    expect(lastStep(t).state.visited).toEqual(["B", "A"]);
    expect(t.visited("A")).toBe(true);
    expect(lastStep(t).caption).toBe("Visit B");
  });

  test("focus sets the current node", () => {
    const t = traceGraph(input);
    t.focus("C");
    expect(lastStep(t)).toMatchObject({ op: "focus", caption: "Work on C", state: { current: "C" } });
  });

  test("edge marks work in either direction", () => {
    const t = traceGraph(input);
    t.edge("B", "A", "tree");
    expect(lastStep(t).state.edgeMarks).toEqual({ [edgeKey("A", "B")]: "tree" });
    expect(lastStep(t).caption).toBe("Edge B-A is a tree edge");
  });

  test("queue takes from the front and sets the current node", () => {
    const t = traceGraph(input);
    const q = t.queue(["A"]);
    q.push("B");
    expect(q.length).toBe(2);
    expect(q.shift()).toBe("A");
    expect(lastStep(t)).toMatchObject({ caption: "Dequeue A", state: { current: "A", list: { kind: "queue", items: ["B"] } } });
    expect(t.steps.map((s) => s.caption).slice(1)).toEqual(["Start a queue: A", "Enqueue B", "Dequeue A"]);
  });

  test("stack takes from the top", () => {
    const t = traceGraph(input);
    const s = t.stack();
    s.push("A");
    s.push("B");
    expect(s.pop()).toBe("B");
    expect(lastStep(t)).toMatchObject({ caption: "Pop B", state: { list: { kind: "stack", items: ["A"] } } });
    expect(t.steps[1].caption).toBe("Start a stack: empty");
  });

  test("taking from an empty list throws", () => {
    const t = traceGraph(input);
    expect(() => t.queue().shift()).toThrow("the queue is empty");
    expect(() => t.stack().pop()).toThrow("the stack is empty");
  });

  test("a list rejects unknown nodes", () => {
    const t = traceGraph(input);
    expect(() => t.queue(["Z"])).toThrow(RangeError);
    expect(() => t.stack().push("Z")).toThrow(RangeError);
  });

  test("a replaced list throws instead of recording steps nobody sees", () => {
    const t = traceGraph(input);
    const q = t.queue(["A"]);
    t.stack();
    expect(() => q.push("B")).toThrow("replaced");
    expect(() => q.shift()).toThrow("replaced");
  });
});

describe("graphView", () => {
  const state = (over: Partial<GraphState> = {}): GraphState => ({
    nodes: ["A", "B", "C", "D"],
    edges: [["A", "B"], ["A", "C"], ["B", "D"]],
    directed: false,
    visited: [],
    current: null,
    edgeMarks: {},
    list: null,
    tags: {},
    ...over,
  });
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  const circles = (svg: Element) => [...svg.querySelectorAll("circle")];

  test("draws a circle per node and a line per edge", () => {
    const svg = parse(graphView(state()));
    expect(circles(svg)).toHaveLength(4);
    expect(svg.querySelectorAll("line")).toHaveLength(3);
  });

  test("puts nodes in rows by distance from the first node", () => {
    const svg = parse(graphView(state({ nodes: ["A", "B", "C", "D", "Z"] })));
    const rowOf = Object.fromEntries(circles(svg).map((c, i) => [["A", "B", "C", "D", "Z"][i], c.getAttribute("cy")]));
    expect(rowOf.B).toBe(rowOf.C);
    expect(new Set([rowOf.A, rowOf.B, rowOf.D, rowOf.Z]).size).toBe(4);
  });

  test("current wins over visited, and the rest are idle", () => {
    const svg = parse(graphView(state({ current: "A", visited: ["A", "B"] })));
    expect(circles(svg).map((c) => c.getAttribute("data-state"))).toEqual(["active", "marked", "idle", "idle"]);
  });

  test("marked edges are drawn marked", () => {
    const svg = parse(graphView(state({ edgeMarks: { [edgeKey("C", "A")]: "tree" } })));
    expect([...svg.querySelectorAll("line")].map((l) => l.getAttribute("data-state"))).toEqual(["idle", "marked", "idle"]);
  });

  test("draws the list under the graph and describes it in the label", () => {
    const svg = parse(graphView(state({ visited: ["A"], current: "A", list: { kind: "queue", items: ["B", "C"] } })));
    expect(svg.querySelectorAll("rect")).toHaveLength(2);
    expect([...svg.querySelectorAll("text")].map((t) => t.textContent)).toContain("queue");
    expect(svg.getAttribute("aria-label")).toBe("Graph: visited A; current A; queue B, C");
  });

  test("escapes node ids", () => {
    const svg = parse(graphView(state({ nodes: ["<x>"], edges: [] })));
    expect(svg.querySelector("text")!.textContent).toBe("<x>");
  });
});

describe("directed and weighted graphs", () => {
  const roads = { nodes: ["A", "B", "C"], edges: [["A", "B", 4], ["B", "C", 1]] as [string, string, number][], directed: true };
  const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

  test("directed edges only go one way", () => {
    const t = traceGraph(roads);
    expect(t.neighbors("A")).toEqual(["B"]);
    expect(t.neighbors("B")).toEqual(["C"]);
    expect(() => t.edge("B", "A", "tree")).toThrow("no edge B-A");
    t.edge("A", "B", "tree");
    expect(t.steps.at(-1)!.state.edgeMarks).toEqual({ [edgeKey("A", "B", true)]: "tree" });
    expect(edgeKey("A", "B", true)).not.toBe(edgeKey("B", "A", true));
  });

  test("weight reads an edge's weight, 1 when unweighted", () => {
    expect(traceGraph(roads).weight("A", "B")).toBe(4);
    expect(traceGraph({ nodes: ["A", "B"], edges: [["A", "B"]] }).weight("B", "A")).toBe(1);
    expect(() => traceGraph({ nodes: ["A", "B"], edges: [["A", "B", NaN]] })).toThrow("weight");
  });

  test("draws a directed graph with no cycle in layers, each node below everything pointing to it", () => {
    const t = traceGraph({ nodes: ["coat", "tie", "shirt"], edges: [["shirt", "tie"], ["tie", "coat"], ["shirt", "coat"]], directed: true });
    const svg = parse(t.view!(t.steps[0].state));
    const y = (id: string) => Number([...svg.querySelectorAll("text")].find((x) => x.textContent === id)!.getAttribute("y"));
    expect(y("shirt")).toBeLessThan(y("tie"));
    expect(y("tie")).toBeLessThan(y("coat"));
  });

  test("draws an arrowhead per directed edge, weights, and tags", () => {
    const t = traceGraph(roads);
    t.tag("A", 0);
    const svg = parse(t.view!(t.steps.at(-1)!.state));
    expect(svg.querySelectorAll("path.stepthru-arrow")).toHaveLength(2);
    expect([...svg.querySelectorAll(".stepthru-weight")].map((x) => x.textContent)).toEqual(["4", "1"]);
    expect(svg.querySelector(".stepthru-tag")!.textContent).toBe("0");
    expect(svg.getAttribute("aria-label")).toContain("Directed graph");
    t.tag("A", null);
    expect(t.steps.at(-1)!.state.tags).toEqual({});
  });
});

describe("captions", () => {
  test("every tracer's default captions can be replaced, for example translated", async () => {
    const { traceArray, traceTree, traceGrid } = await import("../../src/index");
    const a = traceArray([2, 1], { captions: { compare: (x, y) => `${x} ба ${y}-г харьцуулах` } });
    a.compare(0, 1);
    a.swap(0, 1);
    expect(a.steps.map((s) => s.caption).slice(1)).toEqual(["2 ба 1-г харьцуулах", "Swap 2 and 1"]);
    const g = traceGraph({ nodes: ["A"], edges: [] }, { captions: { visit: (id) => `${id}-д очих` } });
    g.visit("A");
    expect(g.steps.at(-1)!.caption).toBe("A-д очих");
    const tr = traceTree(null, { captions: { addRoot: (v) => `${v} үндэс болно` } });
    tr.addRoot(5);
    expect(tr.steps.at(-1)!.caption).toBe("5 үндэс болно");
    const gr = traceGrid([[1]], { captions: { mark: () => "хариу" } });
    gr.mark(0, 0, "answer");
    expect(gr.steps.at(-1)!.caption).toBe("хариу");
  });
});
