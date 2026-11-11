import { traceGrid, type Cell } from "../src/index";

/** Shortest path through a maze with BFS, from the top left to the bottom right. `#` is a wall. */
export function mazePath(maze: string[]) {
  const t = traceGrid<number | "#">(maze.map((row) => [...row].map((ch) => (ch === "#" ? "#" : null))), {
    caption: "Shortest path through a maze with BFS",
    wall: (v) => v === "#",
  });
  const goal: Cell = [t.rows - 1, t.cols - 1];
  const key = ([r, c]: Cell) => `${r},${c}`;
  const cameFrom = new Map<string, Cell>();

  t.set(0, 0, 0, "Start at the top left, 0 steps away");
  const queue: Cell[] = [[0, 0]];
  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    if (r === goal[0] && c === goal[1]) break;
    const d = t.get(r, c) as number;
    t.look([[r, c]], `Take ${r},${c} from the queue: ${d} steps away`);
    for (const next of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as Cell[]) {
      const [nr, nc] = next;
      if (nr < 0 || nr >= t.rows || nc < 0 || nc >= t.cols || t.get(nr, nc) !== null) continue;
      t.set(nr, nc, d + 1, `Reach ${nr},${nc} in ${d + 1} steps`);
      cameFrom.set(key(next), [r, c]);
      queue.push(next);
    }
  }

  const steps = t.get(...goal);
  if (steps === null) {
    t.note("The exit cannot be reached");
    return t;
  }
  // Walk back from the exit along the cells each one was reached from.
  for (let cell: Cell | undefined = goal; cell; cell = cameFrom.get(key(cell))) t.mark(...cell, "path", "Walk back along the path");
  t.note(`Shortest path: ${steps} steps`);
  return t;
}
