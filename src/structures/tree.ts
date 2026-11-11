import { createTrace, type Trace } from "../core/trace.js";
import { edgeLine, frame, NODE_R, nodeCircle, type Point } from "./svg.js";

export type Side = "left" | "right";

/** A nested binary tree literal, used to start from an existing tree. */
export interface TreeInput {
  value: number;
  left?: TreeInput | null;
  right?: TreeInput | null;
}

export interface TreeNode {
  value: number;
  left: number | null;
  right: number | null;
}

export interface TreeState {
  /** Nodes by id. A node's id is its index here. */
  nodes: TreeNode[];
  root: number | null;
  /** The node being worked on, set by `compare` and `focus`. */
  current: number | null;
  /** Node ids in the order they were visited, drawn as a row under the tree. */
  visited: number[];
}

/** A binary tree whose hooks record a step each time they run. Every hook takes an optional caption. */
export interface TreeTrace extends Trace<TreeState> {
  /** Root id, or null when the tree is empty. Does not record a step. */
  readonly root: number | null;
  /** Does not record a step. */
  value(id: number): number;
  /** Child id, or null. Does not record a step. */
  child(id: number, side: Side): number | null;
  /** Returns `value` minus the node's value and makes the node current. */
  compare(value: number, id: number, caption?: string): number;
  /** Adds the root of an empty tree and returns its id. */
  addRoot(value: number, caption?: string): number;
  /** Adds a child in an empty slot and returns its id. */
  addChild(parent: number, side: Side, value: number, caption?: string): number;
  focus(id: number, caption?: string): void;
  visit(id: number, caption?: string): void;
  note(caption: string): void;
}

/** Default captions, one per hook. Node values arrive as numbers. */
export interface TreeCaptions {
  compare(value: number, node: number): string;
  addRoot(value: number): string;
  addChild(value: number, side: Side, parent: number): string;
  focus(value: number): string;
  visit(value: number): string;
}

export const TREE_CAPTIONS: TreeCaptions = {
  compare: (value, node) => `Compare ${value} with ${node}`,
  addRoot: (value) => `${value} becomes the root`,
  addChild: (value, side, parent) => `Add ${value} as the ${side} child of ${parent}`,
  focus: (value) => `Go to ${value}`,
  visit: (value) => `Visit ${value}`,
};

export interface TreeOptions {
  caption?: string;
  /** Replaces default captions, for example to translate them. */
  captions?: Partial<TreeCaptions>;
}

function flatten(input: TreeInput | null | undefined, nodes: TreeNode[]): number | null {
  if (!input) return null;
  const id = nodes.push({ value: input.value, left: null, right: null }) - 1;
  nodes[id].left = flatten(input.left, nodes);
  nodes[id].right = flatten(input.right, nodes);
  return id;
}

/** The second argument is a caption, or options with a caption and translated captions. */
export function traceTree(input: TreeInput | null = null, options: string | TreeOptions = {}): TreeTrace {
  const { caption = "", captions } = typeof options === "string" ? { caption: options } : options;
  const say: TreeCaptions = { ...TREE_CAPTIONS, ...captions };
  const nodes: TreeNode[] = [];
  const s: TreeState = { nodes, root: flatten(input, nodes), current: null, visited: [] };
  const t = createTrace(s, caption);

  const node = (id: number) => {
    if (!Number.isInteger(id) || !s.nodes[id]) throw new RangeError(`unknown node ${id}`);
    return s.nodes[id];
  };
  const step = (op: string, caption: string) => t.record(op, s, caption);
  const add = (value: number) => s.nodes.push({ value, left: null, right: null }) - 1;

  return {
    ...t,
    view: treeView,
    get root() {
      return s.root;
    },
    value: (id) => node(id).value,
    child: (id, side) => node(id)[side],
    compare(value, id, caption) {
      const n = node(id);
      s.current = id;
      step("compare", caption ?? say.compare(value, n.value));
      return value - n.value;
    },
    addRoot(value, caption) {
      if (s.root !== null) throw new RangeError("the tree already has a root");
      s.root = add(value);
      s.current = s.root;
      step("add", caption ?? say.addRoot(value));
      return s.root;
    },
    addChild(parent, side, value, caption) {
      const p = node(parent);
      if (p[side] !== null) throw new RangeError(`node ${parent} already has a ${side} child`);
      const id = add(value);
      p[side] = id;
      s.current = id;
      step("add", caption ?? say.addChild(value, side, p.value));
      return id;
    },
    focus(id, caption) {
      const n = node(id);
      s.current = id;
      step("focus", caption ?? say.focus(n.value));
    },
    visit(id, caption) {
      const n = node(id);
      if (!s.visited.includes(id)) s.visited.push(id);
      step("visit", caption ?? say.visit(n.value));
    },
    note(caption) {
      step("note", caption);
    },
  };
}

const GAP_X = 44;
const GAP_Y = 64;

/** x from in-order position, y from depth. Subtrees never overlap. */
function layout(s: TreeState): Map<number, Point> {
  const pos = new Map<number, Point>();
  let column = 0;
  const walk = (id: number | null, depth: number) => {
    if (id === null) return;
    walk(s.nodes[id].left, depth + 1);
    pos.set(id, [column++ * GAP_X + NODE_R + 2, depth * GAP_Y + NODE_R + 2]);
    walk(s.nodes[id].right, depth + 1);
  };
  walk(s.root, 0);
  return pos;
}

/** Draws the tree top-down with the visit order underneath. */
export function treeView(s: TreeState): string {
  const pos = layout(s);
  const points = [...pos.values()];
  const width = Math.max(0, ...points.map(([x]) => x)) + NODE_R + 2;
  const height = Math.max(0, ...points.map(([, y]) => y)) + NODE_R + 2;

  const edges: string[] = [];
  const circles: string[] = [];
  for (const [id, at] of pos) {
    const n = s.nodes[id];
    for (const child of [n.left, n.right]) {
      if (child === null) continue;
      // Each edge rides with its child, drawn from the child to the parent, so it moves when the layout shifts.
      const [cx, cy] = pos.get(child)!;
      edges.push(`<g data-key="e${child}" transform="translate(${cx} ${cy})">${edgeLine([0, 0], [at[0] - cx, at[1] - cy], "idle")}</g>`);
    }
    const state = id === s.current ? "active" : s.visited.includes(id) ? "marked" : "idle";
    circles.push(nodeCircle(at, n.value, state, { key: `n${id}` }));
  }

  const order = s.visited.map((id) => s.nodes[id].value);
  const label = s.root === null
    ? "Tree: empty"
    : `Tree: ${pos.size} nodes${s.current !== null ? `; current ${s.nodes[s.current].value}` : ""}; visited ${order.join(", ") || "none"}`;
  return frame(
    label,
    { svg: edges.join("") + circles.join(""), width, height },
    order.length > 0 ? { label: "visited", items: order } : null,
  );
}
