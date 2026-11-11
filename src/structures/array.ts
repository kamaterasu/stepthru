import { createTrace, type Trace } from "../core/trace.js";
import { edgeLine, escape, frame, frameSize, NODE_R, nodeCircle, type Point } from "./svg.js";

export interface ArrayState<T = number> {
  values: T[];
  /** A stable id per value, so a view can follow a value as swaps move it. */
  ids: number[];
  /** Indexes the current step looks at, such as a compare. */
  active: number[];
  /** Indexes whose values the current step moved, such as a swap. */
  moved: number[];
  /** Index to mark name, such as "sorted" or "found". */
  marks: Record<number, string>;
  /** Pointer name to index. */
  pointers: Record<string, number>;
  /** Range name to inclusive [lo, hi]. Cells outside every range are dimmed. */
  ranges: Record<string, [number, number]>;
  /** A list of values drawn under the array, such as a merge buffer. One at a time. */
  list: { name: string; items: T[] } | null;
}

/** Default captions, one per hook. Values arrive as their cell text. Override any of them with the `captions` option. */
export interface ArrayCaptions {
  compare(a: string, b: string): string;
  swap(a: string, b: string): string;
  set(index: number, value: string): string;
  mark(value: string, name: string): string;
  pointer(name: string, index: number): string;
  range(name: string, lo: number, hi: number): string;
  list(name: string, items: string[]): string;
  clear(name: string): string;
}

export const ARRAY_CAPTIONS: ArrayCaptions = {
  compare: (a, b) => `Compare ${a} and ${b}`,
  swap: (a, b) => `Swap ${a} and ${b}`,
  set: (i, v) => `Set index ${i} to ${v}`,
  mark: (v, name) => `${v} is ${name}`,
  pointer: (name, i) => `${name} at index ${i}`,
  range: (name, lo, hi) => `${name}: indexes ${lo} to ${hi}`,
  list: (name, items) => `${name}: ${items.join(", ") || "empty"}`,
  clear: (name) => `Clear ${name}`,
};

export interface ArrayOptions<T> {
  caption?: string;
  /** Replaces default captions, for example to translate them. */
  captions?: Partial<ArrayCaptions>;
  /** Orders two values like a sort comparator. Required for objects; numbers and strings have a default. */
  compare?: (a: T, b: T) => number;
  /** Text drawn in a cell. Defaults to the value itself, or its JSON for objects. */
  label?: (value: T) => string;
}

/** An array whose hooks record a step each time they run. Every hook takes an optional caption. */
export interface ArrayTrace<T = number> extends Trace<ArrayState<T>> {
  readonly length: number;
  /** Reads a value without recording a step. */
  get(i: number): T;
  /** Returns a negative number, zero or a positive number, like a sort comparator. */
  compare(i: number, j: number, caption?: string): number;
  swap(i: number, j: number, caption?: string): void;
  /** Writes a value at an index, such as when a merge copies values back. */
  set(i: number, value: T, caption?: string): void;
  mark(i: number, name: string, caption?: string): void;
  pointer(name: string, i: number, caption?: string): void;
  range(name: string, lo: number, hi: number, caption?: string): void;
  /** Shows `items` in a row under the array, called `name`. Replaces any earlier list. */
  list(name: string, items: readonly T[], caption?: string): void;
  /** Removes the pointer, the range and the list called `name`. */
  clear(name: string, caption?: string): void;
  note(caption: string): void;
}

/** Numbers and strings in their natural order. Objects need their own comparator. */
function naturalOrder(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  throw new TypeError("traceArray can only compare numbers or strings by itself; pass options.compare");
}

const defaultLabel = (v: unknown) => (typeof v === "object" && v !== null ? JSON.stringify(v) : String(v));

/**
 * Traces an array of numbers, strings or objects. The second argument is a caption, or options
 * with a caption, a comparator and a label for each value.
 */
export function traceArray<T = number>(values: readonly T[], options: string | ArrayOptions<T> = {}): ArrayTrace<T> {
  if (values.length === 0) throw new RangeError("traceArray needs at least one value");
  const { caption = "", compare: order = naturalOrder, label = defaultLabel, captions } = typeof options === "string" ? { caption: options } : options;
  const say: ArrayCaptions = { ...ARRAY_CAPTIONS, ...captions };
  const s: ArrayState<T> = {
    values: [...values],
    ids: values.map((_, i) => i),
    active: [],
    moved: [],
    marks: {},
    pointers: {},
    ranges: {},
    list: null,
  };
  const t = createTrace(s, caption);
  const last = s.values.length - 1;
  const text = (i: number) => label(s.values[i]);

  const check = (...indexes: number[]) => {
    for (const i of indexes) {
      if (!Number.isInteger(i) || i < 0 || i > last) throw new RangeError(`index ${i} is outside 0..${last}`);
    }
  };
  const step = (op: string, active: number[], caption: string, moved: number[] = []) => {
    s.active = active;
    s.moved = moved;
    t.record(op, s, caption);
  };
  const swapIn = <V>(list: V[], i: number, j: number) => {
    [list[i], list[j]] = [list[j], list[i]];
  };

  return {
    ...t,
    view: label === defaultLabel ? arrayView : (state) => arrayView(state, label),
    size: (state) => arraySize(state, label),
    length: s.values.length,
    get(i) {
      check(i);
      return s.values[i];
    },
    compare(i, j, caption) {
      check(i, j);
      const result = order(s.values[i], s.values[j]);
      step("compare", [i, j], caption ?? say.compare(text(i), text(j)));
      return result;
    },
    swap(i, j, caption) {
      check(i, j);
      swapIn(s.values, i, j);
      swapIn(s.ids, i, j);
      step("swap", [], caption ?? say.swap(text(j), text(i)), [i, j]);
    },
    set(i, value, caption) {
      check(i);
      s.values[i] = value;
      step("set", [], caption ?? say.set(i, text(i)), [i]);
    },
    mark(i, name, caption) {
      check(i);
      s.marks[i] = name;
      step("mark", [i], caption ?? say.mark(text(i), name));
    },
    pointer(name, i, caption) {
      check(i);
      s.pointers[name] = i;
      step("pointer", [i], caption ?? say.pointer(name, i));
    },
    range(name, lo, hi, caption) {
      check(lo, hi);
      if (lo > hi) throw new RangeError(`range ${name}: lo ${lo} is above hi ${hi}`);
      s.ranges[name] = [lo, hi];
      step("range", [], caption ?? say.range(name, lo, hi));
    },
    list(name, items, caption) {
      s.list = { name, items: [...items] };
      step("list", s.active, caption ?? say.list(name, items.map(label)), s.moved);
    },
    clear(name, caption) {
      delete s.pointers[name];
      delete s.ranges[name];
      if (s.list?.name === name) s.list = null;
      step("clear", [], caption ?? say.clear(name));
    },
    note(caption) {
      step("note", s.active, caption, s.moved);
    },
  };
}

const CELL = 40;
const GAP = 4;
const CHAR_W = 10; // rough width of one character at the default font size
const TOP = 24; // room for range brackets above the cells
const BOTTOM = TOP + CELL;

/** At least CELL, wider when a label would not fit. */
const cellWidth = (labels: readonly string[]) => Math.max(CELL, ...labels.map((l) => l.length * CHAR_W + 12));

interface Geometry { w: number; pitch: number; center: (i: number) => number }
const geometry = (labels: readonly string[]): Geometry => {
  const w = cellWidth(labels);
  const pitch = w + GAP;
  return { w, pitch, center: (i) => i * pitch + w / 2 };
};

const stateOf = (s: ArrayState<unknown>, i: number) =>
  s.moved.includes(i) ? "moved" : s.active.includes(i) ? "active" : i in s.marks ? "marked" : "idle";
const outside = (ranges: [number, number][], i: number) => ranges.length > 0 && !ranges.some(([lo, hi]) => i >= lo && i <= hi);

// Each cell is a group keyed by its value's id and placed with a translate, so render can slide it when a swap moves it.
function cell(s: ArrayState<unknown>, g: Geometry, ranges: [number, number][], text: string, i: number): string {
  return `<g data-key="${s.ids[i]}" transform="translate(${i * g.pitch} ${TOP})"${outside(ranges, i) ? ' data-dim=""' : ""}>`
    + `<rect data-state="${stateOf(s, i)}" width="${g.w}" height="${CELL}" rx="4"/>`
    + `<text x="${g.w / 2}" y="${CELL / 2}" text-anchor="middle" dominant-baseline="central">${escape(text)}</text></g>`;
}

// shortcut: overlapping ranges draw on top of each other; stack them if a target needs two at once.
function range(g: Geometry, name: string, [lo, hi]: [number, number]): string {
  const x1 = lo * g.pitch;
  const x2 = hi * g.pitch + g.w;
  return `<path class="stepthru-range" d="M${x1} ${TOP - 4}V${TOP - 10}H${x2}V${TOP - 4}"/>`
    + `<text x="${(x1 + x2) / 2}" y="${TOP - 14}" text-anchor="middle" font-size="11">${escape(name)}</text>`;
}

function pointers(s: ArrayState<unknown>, { center }: Geometry): string[] {
  const names = new Map<number, string[]>();
  for (const [name, i] of Object.entries(s.pointers)) names.set(i, [...(names.get(i) ?? []), name]);
  return [...names].map(
    ([i, list]) => `<path class="stepthru-pointer" d="M${center(i)} ${BOTTOM + 6}l5 8h-10z"/>`
      + `<text x="${center(i)}" y="${BOTTOM + 30}" text-anchor="middle" font-size="11">${escape(list.join(", "))}</text>`,
  );
}

const ARRAY_H = BOTTOM + 36;

/** The array drawing shared by arrayView and heapView: brackets, cells, pointers, and the text that describes them. */
function arrayBody<T>(s: ArrayState<T>, label: (value: T) => string) {
  const labels = s.values.map(label);
  const g = geometry(labels);
  const ranges = Object.values(s.ranges);
  const svg = [
    ...Object.entries(s.ranges).map(([name, r]) => range(g, name, r)),
    ...labels.map((l, i) => cell(s, g, ranges, l, i)),
    ...pointers(s, g),
  ].join("");
  const list = s.list && { label: s.list.name, items: s.list.items.map(label) };
  const described = labels.map((l, i) => (i in s.marks ? `${l} (${s.marks[i]})` : l)).join(", ")
    + (list ? `; ${list.label}: ${list.items.join(", ") || "empty"}` : "");
  return { svg, width: s.values.length * g.pitch - GAP, height: ARRAY_H, labels, ranges, list, described };
}

/** The size arrayView draws a state at, without building its markup. */
function arraySize<T>(s: ArrayState<T>, label: (value: T) => string) {
  const width = s.values.length * (cellWidth(s.values.map(label)) + GAP) - GAP;
  return frameSize({ width, height: ARRAY_H }, s.list && { label: s.list.name, items: s.list.items.map(label) });
}

/** Draws cells with their values, range brackets above, pointers below and the list under those. */
export function arrayView<T>(s: ArrayState<T>, label: (value: T) => string = defaultLabel): string {
  const body = arrayBody(s, label);
  return frame(`Array: ${body.described}`, body, body.list);
}

const LEVEL_Y = 56;
const SLOT = 2 * NODE_R + 8;

/** Where index `i` sits when the array is read as a binary heap: children of `i` are `2i + 1` and `2i + 2`. */
const heapDepth = (n: number) => Math.floor(Math.log2(n));
const heapTreeSize = (n: number, arrayWidth: number) =>
  [Math.max(2 ** heapDepth(n) * SLOT, arrayWidth), heapDepth(n) * LEVEL_Y + 2 * NODE_R + 12] as const;

/**
 * Draws the array as a binary heap: a tree on top, the array underneath. Pass it as `render`'s `view`
 * for heapsort or a priority queue. Values slide along the tree and the array when swapped.
 */
export function heapView<T>(s: ArrayState<T>, label: (value: T) => string = defaultLabel): string {
  const body = arrayBody(s, label);
  const [treeW, treeH] = heapTreeSize(s.values.length, body.width);
  const at = (i: number): Point => {
    const d = Math.floor(Math.log2(i + 1));
    return [((i + 1 - 2 ** d + 0.5) * treeW) / 2 ** d, d * LEVEL_Y + NODE_R + 2];
  };
  const parts: string[] = [];
  for (let i = 1; i < s.values.length; i++) {
    const line = edgeLine(at((i - 1) >> 1), at(i), "idle");
    parts.push(outside(body.ranges, i) ? `<g data-dim="">${line}</g>` : line);
  }
  body.labels.forEach((l, i) =>
    parts.push(nodeCircle(at(i), l, stateOf(s, i), { key: `n${s.ids[i]}`, dim: outside(body.ranges, i) })));
  parts.push(`<g transform="translate(${(treeW - body.width) / 2} ${treeH})">${body.svg}</g>`);
  return frame(`Heap: ${body.described}`, { svg: parts.join(""), width: treeW, height: treeH + body.height }, body.list);
}
