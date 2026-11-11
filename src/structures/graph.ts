import { createTrace, type Trace } from "../core/trace.js";
import { edgeLine, escape, frame, NODE_R, nodeCircle, type Point } from "./svg.js";

/** An edge between two node ids, with an optional weight. */
export type Edge = [from: string, to: string] | [from: string, to: string, weight: number];

export interface GraphInput {
  nodes: string[];
  edges: Edge[];
  /** Edges go from their first node to their second. Undirected by default. */
  directed?: boolean;
}

type ListKind = "queue" | "stack";

export interface GraphState {
  nodes: string[];
  edges: Edge[];
  directed: boolean;
  /** Node ids in the order they were visited. */
  visited: string[];
  /** The node being worked on, set by `focus`, `shift` and `pop`. */
  current: string | null;
  /** `edgeKey(u, v, directed)` to mark name, such as "tree". */
  edgeMarks: Record<string, string>;
  /** The queue or stack drawn under the graph. One at a time. */
  list: { kind: ListKind; items: string[] } | null;
  /** Short text drawn under a node, such as a distance in Dijkstra's algorithm. */
  tags: Record<string, string>;
}

/** Default captions, one per hook. Override any of them with the `captions` option. */
export interface GraphCaptions {
  start(kind: ListKind, items: string[]): string;
  add(kind: ListKind, id: string): string;
  take(kind: ListKind, id: string): string;
  visit(id: string): string;
  focus(id: string): string;
  edge(u: string, v: string, mark: string): string;
  tag(id: string, text: string | null): string;
}

export const GRAPH_CAPTIONS: GraphCaptions = {
  start: (kind, items) => `Start a ${kind}: ${items.join(", ") || "empty"}`,
  add: (kind, id) => `${kind === "queue" ? "Enqueue" : "Push"} ${id}`,
  take: (kind, id) => `${kind === "queue" ? "Dequeue" : "Pop"} ${id}`,
  visit: (id) => `Visit ${id}`,
  focus: (id) => `Work on ${id}`,
  edge: (u, v, mark) => `Edge ${u}-${v} is a ${mark} edge`,
  tag: (id, text) => (text === null ? `Clear the label of ${id}` : `${id}: ${text}`),
};

export interface GraphOptions {
  caption?: string;
  /** Replaces default captions, for example to translate them. */
  captions?: Partial<GraphCaptions>;
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
  /** Neighbors in the order their edges were given; for a directed graph, the nodes edges go to. Does not record a step. */
  neighbors(id: string): readonly string[];
  /** The weight of the edge from `u` to `v`, or 1 when it has none. Does not record a step. */
  weight(u: string, v: string): number;
  /** Does not record a step. */
  visited(id: string): boolean;
  visit(id: string, caption?: string): void;
  focus(id: string, caption?: string): void;
  edge(u: string, v: string, mark: string, caption?: string): void;
  /** Draws short text under a node, such as its distance. `null` removes it. */
  tag(id: string, text: string | number | null, caption?: string): void;
  queue(items?: string[], caption?: string): GraphQueue;
  stack(items?: string[], caption?: string): GraphStack;
  note(caption: string): void;
}

/** Key for an edge's mark. Order-free unless the graph is directed. */
export const edgeKey = (u: string, v: string, directed = false) => JSON.stringify(directed ? [u, v] : [u, v].sort());

/** Each node's outgoing edges, as [neighbor, weight]. Undirected edges go both ways. */
function adjacency({ nodes, edges, directed = false }: GraphInput): Map<string, [string, number][]> {
  const adj = new Map<string, [string, number][]>();
  for (const id of nodes) {
    if (adj.has(id)) throw new RangeError(`duplicate node ${id}`);
    adj.set(id, []);
  }
  for (const [u, v, w = 1] of edges) {
    if (!adj.has(u) || !adj.has(v)) throw new RangeError(`edge ${u}-${v} uses an unknown node`);
    if (u === v) throw new RangeError(`edge ${u}-${v} is a loop; graphs are simple`);
    if (!Number.isFinite(w)) throw new RangeError(`edge ${u}-${v} has weight ${w}; weights must be finite numbers`);
    adj.get(u)!.push([v, w]);
    if (!directed) adj.get(v)!.push([u, w]);
  }
  return adj;
}

/** The second argument is a caption, or options with a caption and translated captions. */
export function traceGraph(input: GraphInput, options: string | GraphOptions = {}): GraphTrace {
  if (input.nodes.length === 0) throw new RangeError("traceGraph needs at least one node");
  const { caption = "", captions } = typeof options === "string" ? { caption: options } : options;
  const say: GraphCaptions = { ...GRAPH_CAPTIONS, ...captions };
  const adj = adjacency(input);
  const directed = input.directed ?? false;
  const s: GraphState = {
    nodes: [...input.nodes],
    edges: input.edges.map((e) => [...e] as Edge),
    directed,
    visited: [],
    current: null,
    edgeMarks: {},
    list: null,
    tags: {},
  };
  const t = createTrace(s, caption);

  const check = (...ids: string[]) => {
    for (const id of ids) if (!adj.has(id)) throw new RangeError(`unknown node ${id}`);
  };
  const outgoing = (u: string, v: string) => {
    check(u, v);
    const found = adj.get(u)!.find(([to]) => to === v);
    if (!found) throw new RangeError(`no edge ${u}-${v}`);
    return found;
  };
  const step = (op: string, caption: string) => t.record(op, s, caption);

  const list = (kind: ListKind, items: string[], caption: string | undefined) => {
    check(...items);
    const own = { kind, items: [...items] };
    s.list = own;
    step(kind, caption ?? say.start(kind, items));
    const live = () => {
      if (s.list !== own) throw new RangeError(`this ${kind} was replaced by a newer queue or stack`);
    };
    return {
      get length() {
        return own.items.length;
      },
      push(id: string, caption?: string) {
        live();
        check(id);
        own.items.push(id);
        step("push", caption ?? say.add(kind, id));
      },
      take(caption?: string) {
        live();
        const id = kind === "queue" ? own.items.shift() : own.items.pop();
        if (id === undefined) throw new RangeError(`the ${kind} is empty`);
        s.current = id;
        step("take", caption ?? say.take(kind, id));
        return id;
      },
    };
  };

  return {
    ...t,
    view: graphView,
    neighbors(id) {
      check(id);
      return adj.get(id)!.map(([v]) => v);
    },
    weight(u, v) {
      return outgoing(u, v)[1];
    },
    visited(id) {
      check(id);
      return s.visited.includes(id);
    },
    visit(id, caption) {
      check(id);
      if (!s.visited.includes(id)) s.visited.push(id);
      step("visit", caption ?? say.visit(id));
    },
    focus(id, caption) {
      check(id);
      s.current = id;
      step("focus", caption ?? say.focus(id));
    },
    edge(u, v, mark, caption) {
      outgoing(u, v);
      s.edgeMarks[edgeKey(u, v, directed)] = mark;
      step("edge", caption ?? say.edge(u, v, mark));
    },
    tag(id, text, caption) {
      check(id);
      const value = text === null ? null : String(text);
      if (value === null) delete s.tags[id];
      else s.tags[id] = value;
      step("tag", caption ?? say.tag(id, value));
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
const TAG_D = NODE_R * 0.8; // a tag sits off the node's upper right, clear of edges straight up, down and sideways
const ARROW = 9;

// shortcut: rows by layer (directed, no cycle) or BFS depth from the first node; edges inside a row can cross nodes. Add a real layout if a target needs it.
/** Rows for a directed graph with no cycle: each node one row below the deepest node pointing to it. Null if there is a cycle. */
function layers(s: GraphState): Map<string, number> | null {
  const out = adjacency({ nodes: s.nodes, edges: s.edges, directed: true });
  const incoming = new Map(s.nodes.map((id) => [id, 0]));
  for (const [, v] of s.edges) incoming.set(v, incoming.get(v)! + 1);
  const depth = new Map(s.nodes.filter((id) => incoming.get(id) === 0).map((id) => [id, 0]));
  const order = [...depth.keys()];
  for (const u of order) {
    for (const [v] of out.get(u)!) {
      depth.set(v, Math.max(depth.get(v) ?? 0, depth.get(u)! + 1));
      incoming.set(v, incoming.get(v)! - 1);
      if (incoming.get(v) === 0) order.push(v);
    }
  }
  return order.length === s.nodes.length ? depth : null;
}

/** Rows by BFS distance from the first node, ignoring direction. Nodes it cannot reach share a last row. */
function rings(s: GraphState): Map<string, number> {
  const adj = adjacency({ nodes: s.nodes, edges: s.edges });
  const depth = new Map([[s.nodes[0], 0]]);
  const order = [s.nodes[0]];
  for (const u of order) {
    for (const [v] of adj.get(u)!) {
      if (!depth.has(v)) {
        depth.set(v, depth.get(u)! + 1);
        order.push(v);
      }
    }
  }
  return depth;
}

function layout(s: GraphState): { pos: Map<string, Point>; width: number; height: number } {
  const depth = (s.directed && layers(s)) || rings(s);
  const unreached = Math.max(...depth.values()) + 1;
  const rows: string[][] = [];
  for (const id of s.nodes) (rows[depth.get(id) ?? unreached] ??= []).push(id);

  const width = Math.max(...rows.map((r) => r.length)) * GAP_X;
  const pos = new Map<string, Point>();
  rows.forEach((row, d) =>
    row.forEach((id, c) => pos.set(id, [((c + 0.5) * width) / row.length, d * GAP_Y + NODE_R + 2])),
  );
  return { pos, width, height: (rows.length - 1) * GAP_Y + 2 * NODE_R + 4 };
}

/** An arrowhead touching the edge of the circle at `to`, pointing away from `from`. */
function arrowhead([x1, y1]: Point, [x2, y2]: Point, state: string): string {
  const len = Math.hypot(x2 - x1, y2 - y1) || 1;
  const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
  const [tx, ty] = [x2 - ux * NODE_R, y2 - uy * NODE_R];
  const [bx, by] = [tx - ux * ARROW, ty - uy * ARROW];
  const r = (n: number) => Math.round(n * 10) / 10;
  return `<path class="stepthru-arrow" data-state="${state}" d="M${r(tx)} ${r(ty)}L${r(bx - uy * ARROW / 2)} ${r(by + ux * ARROW / 2)}L${r(bx + uy * ARROW / 2)} ${r(by - ux * ARROW / 2)}Z"/>`;
}

/** Draws nodes in rows by distance from the first node, with the queue or stack underneath. */
export function graphView(s: GraphState): string {
  const { pos, width, height } = layout(s);
  const lines: string[] = [];
  const marks: string[] = [];
  for (const [u, v, w] of s.edges) {
    const [a, b] = [pos.get(u)!, pos.get(v)!];
    const state = edgeKey(u, v, s.directed) in s.edgeMarks ? "marked" : "idle";
    lines.push(edgeLine(a, b, state));
    if (s.directed) marks.push(arrowhead(a, b, state));
    if (w !== undefined) {
      marks.push(`<text class="stepthru-weight" x="${(a[0] + b[0]) / 2}" y="${(a[1] + b[1]) / 2}" text-anchor="middle" dominant-baseline="central" font-size="11">${escape(w)}</text>`);
    }
  }
  const nodes = s.nodes.map((id) =>
    nodeCircle(pos.get(id)!, id, id === s.current ? "active" : s.visited.includes(id) ? "marked" : "idle"),
  );
  const tags = Object.entries(s.tags).map(([id, text]) => {
    const [x, y] = pos.get(id)!;
    return `<text class="stepthru-tag" x="${x + TAG_D}" y="${y - TAG_D}" font-size="12">${escape(text)}</text>`;
  });
  const tagged = Object.entries(s.tags).map(([id, text]) => `${id} ${text}`).join(", ");
  const label = [
    `visited ${s.visited.join(", ") || "none"}`,
    s.current && `current ${s.current}`,
    tagged && `labels ${tagged}`,
    s.list && `${s.list.kind} ${s.list.items.join(", ") || "empty"}`,
  ].filter(Boolean).join("; ");
  return frame(
    `${s.directed ? "Directed graph" : "Graph"}: ${label}`,
    // Lines first, so circles cover their ends; arrowheads and weights on top of the lines.
    { svg: lines.join("") + nodes.join("") + marks.join("") + tags.join(""), width, height },
    s.list && { label: s.list.kind, items: s.list.items },
  );
}
