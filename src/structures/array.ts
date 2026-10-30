import { createTrace, type Trace } from "../core/trace";
import { escape } from "./svg";

export interface ArrayState {
  values: number[];
  /** Indexes the current step touches. */
  active: number[];
  /** Index to mark name, such as "sorted" or "found". */
  marks: Record<number, string>;
  /** Pointer name to index. */
  pointers: Record<string, number>;
  /** Range name to inclusive [lo, hi]. Cells outside every range are dimmed. */
  ranges: Record<string, [number, number]>;
}

/** An array whose hooks record a step each time they run. Every hook takes an optional caption. */
export interface ArrayTrace extends Trace<ArrayState> {
  readonly length: number;
  /** Reads a value without recording a step. */
  get(i: number): number;
  /** Returns a negative number, zero or a positive number, like a sort comparator. */
  compare(i: number, j: number, caption?: string): number;
  swap(i: number, j: number, caption?: string): void;
  mark(i: number, name: string, caption?: string): void;
  pointer(name: string, i: number, caption?: string): void;
  range(name: string, lo: number, hi: number, caption?: string): void;
  /** Removes the pointer and the range called `name`. */
  clear(name: string, caption?: string): void;
  note(caption: string): void;
}

export function traceArray(values: readonly number[], caption = ""): ArrayTrace {
  if (values.length === 0) throw new RangeError("traceArray needs at least one value");
  const s: ArrayState = { values: [...values], active: [], marks: {}, pointers: {}, ranges: {} };
  const t = createTrace(s, caption);
  const last = s.values.length - 1;

  const check = (...indexes: number[]) => {
    for (const i of indexes) {
      if (!Number.isInteger(i) || i < 0 || i > last) throw new RangeError(`index ${i} is outside 0..${last}`);
    }
  };
  const step = (op: string, active: number[], caption: string) => {
    s.active = active;
    t.record(op, s, caption);
  };

  return {
    steps: t.steps,
    record: t.record,
    view: arrayView,
    length: s.values.length,
    get(i) {
      check(i);
      return s.values[i];
    },
    compare(i, j, caption) {
      check(i, j);
      step("compare", [i, j], caption ?? `Compare ${s.values[i]} and ${s.values[j]}`);
      return s.values[i] - s.values[j];
    },
    swap(i, j, caption) {
      check(i, j);
      [s.values[i], s.values[j]] = [s.values[j], s.values[i]];
      step("swap", [i, j], caption ?? `Swap ${s.values[j]} and ${s.values[i]}`);
    },
    mark(i, name, caption) {
      check(i);
      s.marks[i] = name;
      step("mark", [i], caption ?? `${s.values[i]} is ${name}`);
    },
    pointer(name, i, caption) {
      check(i);
      s.pointers[name] = i;
      step("pointer", [i], caption ?? `${name} at index ${i}`);
    },
    range(name, lo, hi, caption) {
      check(lo, hi);
      s.ranges[name] = [lo, hi];
      step("range", [], caption ?? `${name}: indexes ${lo} to ${hi}`);
    },
    clear(name, caption) {
      delete s.pointers[name];
      delete s.ranges[name];
      step("clear", [], caption ?? `Clear ${name}`);
    },
    note(caption) {
      step("note", s.active, caption);
    },
  };
}

const CELL = 40;
const PITCH = CELL + 4;
const TOP = 24; // room for range brackets above the cells
const BOTTOM = TOP + CELL;

const center = (i: number) => i * PITCH + CELL / 2;

function cell(s: ArrayState, v: number, i: number): string {
  const state = s.active.includes(i) ? "active" : i in s.marks ? "marked" : "idle";
  const ranges = Object.values(s.ranges);
  const dim = ranges.length > 0 && !ranges.some(([lo, hi]) => i >= lo && i <= hi);
  return `<g${dim ? ' data-dim=""' : ""}><rect data-state="${state}" x="${i * PITCH}" y="${TOP}" width="${CELL}" height="${CELL}" rx="4"/>`
    + `<text x="${center(i)}" y="${TOP + CELL / 2}" text-anchor="middle" dominant-baseline="central">${escape(v)}</text></g>`;
}

// shortcut: overlapping ranges draw on top of each other; stack them if a target needs two at once.
function range(name: string, [lo, hi]: [number, number]): string {
  const x1 = lo * PITCH;
  const x2 = hi * PITCH + CELL;
  return `<path class="stepthru-range" d="M${x1} ${TOP - 4}V${TOP - 10}H${x2}V${TOP - 4}"/>`
    + `<text x="${(x1 + x2) / 2}" y="${TOP - 14}" text-anchor="middle" font-size="11">${escape(name)}</text>`;
}

function pointers(s: ArrayState): string[] {
  const names = new Map<number, string[]>();
  for (const [name, i] of Object.entries(s.pointers)) names.set(i, [...(names.get(i) ?? []), name]);
  return [...names].map(
    ([i, list]) => `<path class="stepthru-pointer" d="M${center(i)} ${BOTTOM + 6}l5 8h-10z"/>`
      + `<text x="${center(i)}" y="${BOTTOM + 30}" text-anchor="middle" font-size="11">${escape(list.join(", "))}</text>`,
  );
}

/** Draws cells with their values, range brackets above and pointers below. */
export function arrayView(s: ArrayState): string {
  const width = s.values.length * PITCH - 4;
  const label = s.values.map((v, i) => (i in s.marks ? `${v} (${s.marks[i]})` : v)).join(", ");
  const parts = [
    ...Object.entries(s.ranges).map(([name, r]) => range(name, r)),
    ...s.values.map((v, i) => cell(s, v, i)),
    ...pointers(s),
  ];
  return `<svg viewBox="0 0 ${width} ${BOTTOM + 36}" role="img" aria-label="${escape(`Array: ${label}`)}">${parts.join("")}</svg>`;
}
