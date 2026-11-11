import { traceGrid } from "../src/index";

/** Levenshtein edit distance with a DP table: cell i,j is the cost to turn a's first i letters into b's first j. */
export function editDistance(a: string, b: string) {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const t = traceGrid<number>(Array.from({ length: rows }, () => Array<number | null>(cols).fill(null)), {
    caption: `Edit distance from "${a}" to "${b}"`,
    rowLabels: ["", ...a],
    colLabels: ["", ...b],
  });

  for (let i = 0; i < rows; i++) t.set(i, 0, i, `"${a.slice(0, i)}" to "": ${i} deletes`);
  for (let j = 1; j < cols; j++) t.set(0, j, j, `"" to "${b.slice(0, j)}": ${j} inserts`);

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        t.look([[i - 1, j - 1]], `${a[i - 1]} matches ${b[j - 1]}: no edit, copy the diagonal`);
        t.set(i, j, t.get(i - 1, j - 1)!);
      } else {
        t.look([[i - 1, j - 1], [i - 1, j], [i, j - 1]], `${a[i - 1]} is not ${b[j - 1]}: 1 + the cheapest of replace, delete, insert`);
        t.set(i, j, 1 + Math.min(t.get(i - 1, j - 1)!, t.get(i - 1, j)!, t.get(i, j - 1)!));
      }
    }
  }
  t.mark(rows - 1, cols - 1, "answer", `Edit distance: ${t.get(rows - 1, cols - 1)}`);
  return t;
}
