import { createTrace, type Trace } from "../core/trace.js";
import { escape, frame } from "./svg.js";

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

export interface ArrayOptions<T> {
  caption?: string;
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
  const { caption = "", compare: order = naturalOrder, label = defaultLabel } = typeof options === "string" ? { caption: options } : options;
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
    length: s.values.length,
    get(i) {
      check(i);
      return s.values[i];
    },
    compare(i, j, caption) {
      check(i, j);
      const result = order(s.values[i], s.values[j]);
      step("compare", [i, j], caption ?? `Compare ${text(i)} and ${text(j)}`);
      return result;
    },
    swap(i, j, caption) {
      check(i, j);
      swapIn(s.values, i, j);
      swapIn(s.ids, i, j);
      step("swap", [], caption ?? `Swap ${text(j)} and ${text(i)}`, [i, j]);
    },
    set(i, value, caption) {
      check(i);
      s.values[i] = value;
      step("set", [], caption ?? `Set index ${i} to ${text(i)}`, [i]);
    },
    mark(i, name, caption) {
      check(i);
      s.marks[i] = name;
      step("mark", [i], caption ?? `${text(i)} is ${name}`);
    },
    pointer(name, i, caption) {
      check(i);
      s.pointers[name] = i;
      step("pointer", [i], caption ?? `${name} at index ${i}`);
    },
    range(name, lo, hi, caption) {
      check(lo, hi);
      if (lo > hi) throw new RangeError(`range ${name}: lo ${lo} is above hi ${hi}`);
      s.ranges[name] = [lo, hi];
      step("range", [], caption ?? `${name}: indexes ${lo} to ${hi}`);
    },
    list(name, items, caption) {
      s.list = { name, items: [...items] };
      step("list", s.active, caption ?? `${name}: ${items.map(label).join(", ") || "empty"}`, s.moved);
    },
    clear(name, caption) {
      delete s.pointers[name];
      delete s.ranges[name];
      if (s.list?.name === name) s.list = null;
      step("clear", [], caption ?? `Clear ${name}`);
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

// Each cell is a group keyed by its value's id and placed with a translate, so render can slide it when a swap moves it.
function cell(s: ArrayState<unknown>, g: Geometry, text: string, i: number): string {
  const state = s.moved.includes(i) ? "moved" : s.active.includes(i) ? "active" : i in s.marks ? "marked" : "idle";
  const ranges = Object.values(s.ranges);
  const dim = ranges.length > 0 && !ranges.some(([lo, hi]) => i >= lo && i <= hi);
  return `<g data-key="${s.ids[i]}" transform="translate(${i * g.pitch} ${TOP})"${dim ? ' data-dim=""' : ""}>`
    + `<rect data-state="${state}" width="${g.w}" height="${CELL}" rx="4"/>`
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

/** Draws cells with their values, range brackets above, pointers below and the list under those. */
export function arrayView<T>(s: ArrayState<T>, label: (value: T) => string = defaultLabel): string {
  const labels = s.values.map(label);
  const g = geometry(labels);
  const width = s.values.length * g.pitch - GAP;
  const described = labels.map((l, i) => (i in s.marks ? `${l} (${s.marks[i]})` : l)).join(", ");
  const parts = [
    ...Object.entries(s.ranges).map(([name, r]) => range(g, name, r)),
    ...labels.map((l, i) => cell(s, g, l, i)),
    ...pointers(s, g),
  ];
  const list = s.list && { label: s.list.name, items: s.list.items.map(label) };
  const listText = list ? `; ${list.label}: ${list.items.join(", ") || "empty"}` : "";
  return frame(`Array: ${described}${listText}`, { svg: parts.join(""), width, height: BOTTOM + 36 }, list);
}
