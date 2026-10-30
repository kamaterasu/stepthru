const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for use inside SVG markup, in content or attribute values. */
export const escape = (text: string | number): string =>
  String(text).replace(/[&<>"']/g, (c) => ENTITIES[c]);

export type ShapeState = "idle" | "active" | "marked";
export type Point = readonly [x: number, y: number];

export const NODE_R = 18;
const CELL = 32;
const LABEL_W = 48;
const ROW_GAP = 16;

/** A labelled circle, used for graph and tree nodes. */
export const nodeCircle = ([x, y]: Point, label: string | number, state: ShapeState) =>
  `<circle data-state="${state}" cx="${x}" cy="${y}" r="${NODE_R}"/>`
  + `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central">${escape(label)}</text>`;

/** A line between two node centers. Draw lines before circles so circles cover the ends. */
export const edgeLine = ([x1, y1]: Point, [x2, y2]: Point, state: ShapeState) =>
  `<line data-state="${state}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

export interface Row {
  label: string;
  items: readonly (string | number)[];
}

const rowWidth = (row: Row) => LABEL_W + row.items.length * (CELL + 4);

function boxRow({ label, items }: Row, y: number): string {
  const cells = items.map((item, i) => {
    const x = LABEL_W + i * (CELL + 4);
    return `<rect data-state="idle" x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="4"/>`
      + `<text x="${x + CELL / 2}" y="${y + CELL / 2}" text-anchor="middle" dominant-baseline="central">${escape(item)}</text>`;
  });
  return `<text x="0" y="${y + CELL / 2}" dominant-baseline="central" font-size="11">${escape(label)}</text>${cells.join("")}`;
}

/** Wraps a drawing in an <svg> at its natural size, centered above an optional row of boxes. */
export function frame(
  ariaLabel: string,
  body: { svg: string; width: number; height: number },
  row?: Row | null,
): string {
  const width = Math.max(body.width, row ? rowWidth(row) : 0);
  const rowY = body.height + ROW_GAP;
  const height = row ? rowY + CELL : body.height;
  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(ariaLabel)}">`
    + `<g transform="translate(${(width - body.width) / 2} 0)">${body.svg}</g>`
    + (row ? boxRow(row, rowY) : "")
    + "</svg>";
}
