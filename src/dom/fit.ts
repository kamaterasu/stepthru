export type Size = readonly [width: number, height: number];

const SIZE = /^<svg\b[^>]*?\swidth="([\d.]+)"[^>]*?\sheight="([\d.]+)"/;

/** Reads the natural size from markup that starts with `<svg width=".." height=".."`. Null for anything else. */
export function svgSize(markup: string): Size | null {
  const m = SIZE.exec(markup);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/** The largest width and height among `sizes`, or null when any size is unknown. */
export function largest(sizes: readonly (Size | null)[]): Size | null {
  if (sizes.some((s) => s === null)) return null;
  return [Math.max(...sizes.map((s) => s![0])), Math.max(...sizes.map((s) => s![1]))];
}

/** Grows `svg` to `box` without scaling its drawing: centered across, pinned to the top. */
export function fitTo(svg: SVGSVGElement, [w]: Size, [boxW, boxH]: Size) {
  svg.setAttribute("width", String(boxW));
  svg.setAttribute("height", String(boxH));
  svg.setAttribute("viewBox", `${(w - boxW) / 2} 0 ${boxW} ${boxH}`);
}
