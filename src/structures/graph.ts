import { createTrace, type Trace } from "../core/trace.js";
import { edgeLine, frame, NODE_R, nodeCircle, type Point } from "./svg.js";

export interface GraphInput {
  nodes: string[];
  /** Undirected edges between node ids. */
  edges: [string, string][];
}

type ListKind = "queue" | "stack";

export interface GraphState extends GraphInput {
  /** Node ids in the order they were visited. */
  visited: string[];
  /** The node being worked on, set by `focus`, `shift` and `pop`. */
  current: string | null;
  /** `edgeKey(u, v)` to mark name, such as "tree". */
  edgeMarks: Record<string, string>;
  /** The queue or stack drawn under the graph. One at a time. */
  list: { kind: ListKind; items: string[] } | null;
}

interface GraphList {
  readonly length: number;
  push(id: string, caption?: string): void;
}
export interface GraphQueue extends GraphList {
  /** Takes the front item and makes it the current node. */
  shift(caption?: string): string;
}
export interface GraphStack extends GraphList {
  /** Takes the top item and makes it the current node. */
  pop(caption?: string): string;
}

/** A graph whose hooks record a step each time they run. Every hook takes an optional caption. */
export interface GraphTrace extends Trace<GraphState> {
  /** Neighbors in the order their edges were given. Does not record a step. */
  neighbors(id: string): readonly string[];
  /** Does not record a step. */
  visited(id: string): boolean;
  visit(id: string, caption?: string): void;
  focus(id: string, caption?: string): void;
  edge(u: string, v: string, mark: string, caption?: string): void;
  queue(items?: string[], caption?: string): GraphQueue;
  stack(items?: string[], caption?: string): GraphStack;
  note(caption: string): void;
}

/** Order-free key for an undirected edge. */
export const edgeKey = (u: string, v: string) => JSON.stringify([u, v].sort());

function adjacency({ nodes, edges }: GraphInput): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const id of nodes) {
    if (adj.has(id)) throw new RangeError(`duplicate node ${id}`);
    adj.set(id, []);
  }
  for (const [u, v] of edges) {
    if (!adj.has(u) || !adj.has(v)) throw new RangeError(`edge ${u}-${v} uses an unknown node`);
    adj.get(u)!.push(v);
    adj.get(v)!.push(u);
  }
  return adj;
}

const WORDS: Record<ListKind, [add: string, take: string]> = {
  queue: ["Enqueue", "Dequeue"],
  stack: ["Push", "Pop"],
};

export function traceGraph(input: GraphInput, caption = ""): GraphTrace {
  if (input.nodes.length === 0) throw new RangeError("traceGraph needs at least one node");
  const adj = adjacency(input);
  const s: GraphState = {
    nodes: [...input.nodes],
    edges: input.edges.map(([u, v]) => [u, v]),
    visited: [],
    current: null,
    edgeMarks: {},
    list: null,
  };
  const t = createTrace(s, caption);

  const check = (...ids: string[]) => {
    for (const id of ids) if (!adj.has(id)) throw new RangeError(`unknown node ${id}`);
  };
  const step = (op: string, caption: string) => t.record(op, s, caption);

  const list = (kind: ListKind, items: string[], caption: string | undefined) => {
    check(...items);
    const own = { kind, items: [...items] };
    s.list = own;
    step(kind, caption ?? `Start a ${kind}: ${items.join(", ") || "empty"}`);
    const [add, take] = WORDS[kind];
    return {
      get length() {
        return own.items.length;
      },
      push(id: string, caption?: string) {
        check(id);
        own.items.push(id);
        step("push", caption ?? `${add} ${id}`);
      },
      take(caption?: string) {
        const id = kind === "queue" ? own.items.shift() : own.items.pop();
        if (id === undefined) throw new RangeError(`the ${kind} is empty`);
        s.current = id;
        step("take", caption ?? `${take} ${id}`);
        return id;
      },
    };
  };

  return {
    ...t,
    view: graphView,
    neighbors(id) {
      check(id);
      return adj.get(id)!;
    },
    visited(id) {
      check(id);
      return s.visited.includes(id);
    },
    visit(id, caption) {
      check(id);
      if (!s.visited.includes(id)) s.visited.push(id);
      step("visit", caption ?? `Visit ${id}`);
    },
    focus(id, caption) {
      check(id);
      s.current = id;
      step("focus", caption ?? `Work on ${id}`);
    },
    edge(u, v, mark, caption) {
      check(u, v);
      if (!adj.get(u)!.includes(v)) throw new RangeError(`no edge ${u}-${v}`);
      s.edgeMarks[edgeKey(u, v)] = mark;
      step("edge", caption ?? `Edge ${u}-${v} is a ${mark} edge`);
    },
    queue(items = [], caption) {
      const l = list("queue", items, caption);
      return { get length() { return l.length; }, push: l.push, shift: l.take };
    },
    stack(items = [], caption) {
      const l = list("stack", items, caption);
      return { get length() { return l.length; }, push: l.push, pop: l.take };
    },
    note(caption) {
      step("note", caption);
    },
  };
}

const GAP_X = 72;
const GAP_Y = 72;

// shortcut: rows by BFS depth from the first node; edges inside a row can cross nodes. Add a real layout if a target needs it.
function layout(input: GraphInput): { pos: Map<string, Point>; width: number; height: number } {
  const adj = adjacency(input);
  const depth = new Map([[input.nodes[0], 0]]);
  const order = [input.nodes[0]];
  for (const u of order) {
    for (const v of adj.get(u)!) {
      if (!depth.has(v)) {
        depth.set(v, depth.get(u)! + 1);
        order.push(v);
      }
    }
  }
  const unreached = Math.max(...depth.values()) + 1;
  const rows: string[][] = [];
  for (const id of input.nodes) (rows[depth.get(id) ?? unreached] ??= []).push(id);

  const width = Math.max(...rows.map((r) => r.length)) * GAP_X;
  const pos = new Map<string, Point>();
  rows.forEach((row, d) =>
    row.forEach((id, c) => pos.set(id, [((c + 0.5) * width) / row.length, d * GAP_Y + NODE_R + 2])),
  );
  return { pos, width, height: (rows.length - 1) * GAP_Y + 2 * NODE_R + 4 };
}

/** Draws nodes in rows by distance from the first node, with the queue or stack underneath. */
export function graphView(s: GraphState): string {
  const { pos, width, height } = layout(s);
  const edges = s.edges.map(([u, v]) =>
    edgeLine(pos.get(u)!, pos.get(v)!, edgeKey(u, v) in s.edgeMarks ? "marked" : "idle"),
  );
  const nodes = s.nodes.map((id) =>
    nodeCircle(pos.get(id)!, id, id === s.current ? "active" : s.visited.includes(id) ? "marked" : "idle"),
  );
  const label = [
    `visited ${s.visited.join(", ") || "none"}`,
    s.current && `current ${s.current}`,
    s.list && `${s.list.kind} ${s.list.items.join(", ") || "empty"}`,
  ].filter(Boolean).join("; ");
  return frame(
    `Graph: ${label}`,
    { svg: edges.join("") + nodes.join(""), width, height },
    s.list && { label: s.list.kind, items: s.list.items },
  );
}
