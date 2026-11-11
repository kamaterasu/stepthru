import { createTrace, type Trace } from "../core/trace.js";
import { escape, frame, frameSize } from "./svg.js";

/** A cell position: row, then column, both from 0. */
export type Cell = readonly [row: number, col: number];

export interface GridState<T = number> {
  /** Values by row. `null` is an empty cell, drawn blank. */
  cells: (T | null)[][];
  /** Cells the current step reads, set by `look`. */
  active: Cell[];
  /** Cells the current step wrote, set by `set`. */
  moved: Cell[];
  /** `"row,col"` to mark name, such as "path" or "answer". */
  marks: Record<string, string>;
  rowLabels: string[] | null;
  colLabels: string[] | null;
}

/** Default captions, one per hook. Values arrive as their cell text, or "empty" for null. */
export interface GridCaptions {
  set(row: number, col: number, value: string): string;
  look(values: string[]): string;
  mark(row: number, col: number, name: string): string;
}

export const GRID_CAPTIONS: GridCaptions = {
  set: (r, c, v) => `Set ${r},${c} to ${v}`,
  look: (values) => `Look at ${values.join(", ")}`,
  mark: (r, c, name) => `${r},${c} is ${name}`,
};

export interface GridOptions<T> {
  caption?: string;
  /** Replaces default captions, for example to translate them. */
  captions?: Partial<GridCaptions>;
  /** Text drawn left of each row, such as the letters of a word in a DP table. */
  rowLabels?: readonly string[];
  /** Text drawn above each column. */
  colLabels?: readonly string[];
  /** Text drawn in a cell. Defaults to the value itself. */
  label?: (value: T) => string;
  /** Cells whose value this returns true for are drawn as walls, such as `#` in a maze. */
  wall?: (value: T) => boolean;
}

/** A grid whose hooks record a step each time they run. Every hook takes an optional caption. */
export interface GridTrace<T = number> extends Trace<GridState<T>> {
  readonly rows: number;
  readonly cols: number;
  /** Reads a value without recording a step. */
  get(row: number, col: number): T | null;
  /** Writes a value. */
  set(row: number, col: number, value: T | null, caption?: string): void;
  /** Highlights the cells a step reads, such as the neighbors a DP cell depends on. */
  look(cells: readonly Cell[], caption?: string): void;
  mark(row: number, col: number, name: string, caption?: string): void;
  note(caption: string): void;
}

const key = ([r, c]: Cell) => `${r},${c}`;

/**
 * Traces a grid of values, given as rows. The second argument is a caption, or options with a
 * caption, row and column labels, a label for each value and which values are walls.
 */
export function traceGrid<T = number>(
  cells: readonly (readonly (T | null)[])[],
  options: string | GridOptions<T> = {},
): GridTrace<T> {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  if (rows === 0 || cols === 0) throw new RangeError("traceGrid needs at least one cell");
  if (cells.some((row) => row.length !== cols)) throw new RangeError("every grid row needs the same length");
  const { caption = "", rowLabels, colLabels, label = String, wall, captions } = typeof options === "string" ? { caption: options } : options;
  const say: GridCaptions = { ...GRID_CAPTIONS, ...captions };
  if (rowLabels && rowLabels.length !== rows) throw new RangeError(`rowLabels needs ${rows} labels`);
  if (colLabels && colLabels.length !== cols) throw new RangeError(`colLabels needs ${cols} labels`);

  const s: GridState<T> = {
    cells: cells.map((row) => [...row]),
    active: [],
    moved: [],
    marks: {},
    rowLabels: rowLabels ? [...rowLabels] : null,
    colLabels: colLabels ? [...colLabels] : null,
  };
  const t = createTrace(s, caption);

  const check = (r: number, c: number) => {
    if (!Number.isInteger(r) || r < 0 || r >= rows || !Number.isInteger(c) || c < 0 || c >= cols) {
      throw new RangeError(`cell ${r},${c} is outside the ${rows} by ${cols} grid`);
    }
  };
  const text = (v: T | null) => (v === null ? "empty" : label(v));
  const step = (op: string, active: Cell[], moved: Cell[], caption: string) => {
    s.active = active;
    s.moved = moved;
    t.record(op, s, caption);
  };

  return {
    ...t,
    view: (state) => gridView(state, label, wall),
    size: (state) => gridLayout(state, label),
    rows,
    cols,
    get(r, c) {
      check(r, c);
      return s.cells[r][c];
    },
    set(r, c, value, caption) {
      check(r, c);
      s.cells[r][c] = value;
      step("set", [], [[r, c]], caption ?? say.set(r, c, text(value)));
    },
    look(list, caption) {
      for (const [r, c] of list) check(r, c);
      step("look", list.map(([r, c]) => [r, c]), [], caption ?? say.look(list.map(([lr, lc]) => text(s.cells[lr][lc]))));
    },
    mark(r, c, name, caption) {
      check(r, c);
      s.marks[key([r, c])] = name;
      step("mark", [[r, c]], [], caption ?? say.mark(r, c, name));
    },
    note(caption) {
      step("note", s.active, s.moved, caption);
    },
  };
}

const CELL = 36;
const GAP = 2;
const CHAR_W = 9;
const LABEL = 22; // room for row or column labels

function gridGeometry<T>(s: GridState<T>, label: (value: T) => string) {
  const w = Math.max(CELL, ...s.cells.flat().map((v) => (v === null ? 0 : label(v).length * CHAR_W + 10)));
  const rows = s.cells.length;
  const cols = s.cells[0].length;
  return { w, pitch: w + GAP, left: s.rowLabels ? LABEL : 0, top: s.colLabels ? LABEL : 0, rows, cols };
}

/** The size gridView draws a state at, without building its markup. */
function gridLayout<T>(s: GridState<T>, label: (value: T) => string) {
  const { pitch, left, top, rows, cols } = gridGeometry(s, label);
  return frameSize({ width: left + cols * pitch - GAP, height: top + rows * pitch - GAP });
}

const has = (list: readonly Cell[], r: number, c: number) => list.some(([lr, lc]) => lr === r && lc === c);

/** Draws the cells in rows, with row labels on the left and column labels on top. */
export function gridView<T>(
  s: GridState<T>,
  label: (value: T) => string = String,
  wall?: (value: T) => boolean,
): string {
  const text = (v: T | null) => (v === null ? "" : label(v));
  const { w, pitch, left, top, rows, cols } = gridGeometry(s, label);

  const parts: string[] = [];
  s.colLabels?.forEach((l, c) =>
    parts.push(`<text x="${left + c * pitch + w / 2}" y="${top / 2}" text-anchor="middle" dominant-baseline="central" font-size="11">${escape(l)}</text>`));
  s.rowLabels?.forEach((l, r) =>
    parts.push(`<text x="${left / 2}" y="${top + r * pitch + CELL / 2}" text-anchor="middle" dominant-baseline="central" font-size="11">${escape(l)}</text>`));
  s.cells.forEach((row, r) =>
    row.forEach((v, c) => {
      const mark = s.marks[key([r, c])];
      const state = has(s.moved, r, c) ? "moved"
        : has(s.active, r, c) ? "active"
        : v !== null && wall?.(v) ? "wall"
        : mark ? "marked" : "idle";
      const x = left + c * pitch;
      const y = top + r * pitch;
      parts.push(`<rect data-state="${state}"${mark ? ` data-mark="${escape(mark)}"` : ""} x="${x}" y="${y}" width="${w}" height="${CELL}" rx="3"/>`);
      if (state !== "wall") {
        parts.push(`<text x="${x + w / 2}" y="${y + CELL / 2}" text-anchor="middle" dominant-baseline="central">${escape(text(v))}</text>`);
      }
    }));

  const marked = Object.entries(s.marks).map(([k, name]) => `${k} ${name}`).join(", ");
  return frame(
    `Grid, ${rows} by ${cols}${marked ? `; marked ${marked}` : ""}`,
    { svg: parts.join(""), width: left + cols * pitch - GAP, height: top + rows * pitch - GAP },
  );
}
