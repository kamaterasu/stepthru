import { escape } from "../core/escape.js";

export { escape };

export type ShapeState = "idle" | "active" | "moved" | "marked";
export type Point = readonly [x: number, y: number];

export const NODE_R = 18;
const CELL = 32;
const LABEL_W = 48;
const ROW_GAP = 16;

// Labels longer than this get squeezed to fit inside the circle.
const FIT_CHARS = 3;
const fitText = (label: string | number) =>
  String(label).length > FIT_CHARS ? ` textLength="${2 * NODE_R - 6}" lengthAdjust="spacingAndGlyphs"` : "";

/**
 * A labelled circle, used for graph and tree nodes. With a `key` it is a group placed with a translate,
 * so render can slide it when the node moves between steps.
 */
export function nodeCircle([x, y]: Point, label: string | number, state: ShapeState, { key, dim = false }: { key?: string; dim?: boolean } = {}) {
  const text = `text-anchor="middle" dominant-baseline="central"${fitText(label)}>${escape(label)}</text>`;
  const dimmed = dim ? ' data-dim=""' : "";
  if (key === undefined) return `<circle data-state="${state}"${dimmed} cx="${x}" cy="${y}" r="${NODE_R}"/><text x="${x}" y="${y}" ${text}`;
  return `<g data-key="${escape(key)}" transform="translate(${x} ${y})"${dimmed}><circle data-state="${state}" r="${NODE_R}"/><text ${text}</g>`;
}

/** A line between two node centers. Draw lines before circles so circles cover the ends. */
export const edgeLine = ([x1, y1]: Point, [x2, y2]: Point, state: ShapeState) =>
  `<line data-state="${state}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

export interface Row {
  label: string;
  items: readonly (string | number)[];
}

const CHAR_W = 10; // rough width of one character at the default font size
/** Box width for a row: at least CELL, wider when an item would not fit. */
const boxWidth = (row: Row) => Math.max(CELL, ...row.items.map((item) => String(item).length * CHAR_W + 10));
const rowWidth = (row: Row) => LABEL_W + row.items.length * (boxWidth(row) + 4);

function boxRow(row: Row, y: number): string {
  const { label, items } = row;
  const w = boxWidth(row);
  const cells = items.map((item, i) => {
    const x = LABEL_W + i * (w + 4);
    return `<rect data-state="idle" x="${x}" y="${y}" width="${w}" height="${CELL}" rx="4"/>`
      + `<text x="${x + w / 2}" y="${y + CELL / 2}" text-anchor="middle" dominant-baseline="central">${escape(item)}</text>`;
  });
  return `<text x="0" y="${y + CELL / 2}" dominant-baseline="central" font-size="11">${escape(label)}</text>${cells.join("")}`;
}

/** Wraps a drawing in an <svg> at its natural size, centered above an optional row of boxes. */
/** The size `frame` gives a drawing, without drawing it. */
export function frameSize(body: { width: number; height: number }, row?: Row | null): [width: number, height: number] {
  return [Math.max(body.width, row ? rowWidth(row) : 0), row ? body.height + ROW_GAP + CELL : body.height];
}

export function frame(
  ariaLabel: string,
  body: { svg: string; width: number; height: number },
  row?: Row | null,
): string {
  const [width, height] = frameSize(body, row);
  const rowY = body.height + ROW_GAP;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(ariaLabel)}">`
    + `<g transform="translate(${(width - body.width) / 2} 0)">${body.svg}</g>`
    + (row ? boxRow(row, rowY) : "")
    + "</svg>";
}
