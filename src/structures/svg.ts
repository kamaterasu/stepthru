const ENTITIES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapes text for use inside SVG markup, in content or attribute values. */
export const escape = (text: string | number): string =>
  String(text).replace(/[&<>"']/g, (c) => ENTITIES[c]);
