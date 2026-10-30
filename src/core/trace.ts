export type Vars = Readonly<Record<string, unknown>>;

export interface Step<S> {
  readonly op: string;
  readonly state: S;
  readonly caption: string;
  /** Source line this step came from, set with `at`. 1-based. */
  readonly line?: number;
  /** Variables to show with this step, set with `watch`. */
  readonly vars?: Vars;
}

export interface Trace<S> {
  readonly steps: readonly Step<S>[];
  record(op: string, state: S, caption?: string): void;
  /** Tags the steps recorded from now on with a 1-based source line. Records nothing itself. */
  at(line: number): void;
  /**
   * Shows these variables with the steps recorded from now on. Merges with earlier calls;
   * a value of `undefined` hides that variable. Records nothing itself.
   */
  watch(vars: Record<string, unknown>): void;
  /**
   * How to draw a state. Structure tracers set this so `render` needs no view.
   * Method syntax on purpose: it lets any trace be stored as `Trace<unknown>`, for example in a registry of mixed figures.
   */
  view?(state: S): string;
}

/** Turns one state into SVG markup. Views must escape any text they put in the markup. */
export type View<S> = (state: S) => string;

/** Records a snapshot of `state` at every step. The first step is the initial state. */
export function createTrace<S>(initial: S, caption = ""): Trace<S> {
  const steps: Step<S>[] = [];
  let line: number | undefined;
  let vars: Vars | undefined;

  const record = (op: string, state: S, caption = "") => {
    // Clone so later mutations by the algorithm don't rewrite earlier steps.
    steps.push({
      op,
      state: structuredClone(state),
      caption,
      ...(line !== undefined && { line }),
      ...(vars && { vars }),
    });
  };
  const at = (n: number) => {
    if (!Number.isInteger(n) || n < 1) throw new RangeError(`line ${n} must be a whole number from 1`);
    line = n;
  };
  // A new object per call, so steps can share it safely: it never changes after this.
  const watch = (next: Record<string, unknown>) => {
    vars = { ...vars, ...structuredClone(next) };
  };

  record("init", initial, caption);
  return { steps, record, at, watch };
}
