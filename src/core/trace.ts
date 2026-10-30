export interface Step<S> {
  readonly op: string;
  readonly state: S;
  readonly caption: string;
}

export interface Trace<S> {
  readonly steps: readonly Step<S>[];
  record(op: string, state: S, caption?: string): void;
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
  const record = (op: string, state: S, caption = "") => {
    // Clone so later mutations by the algorithm don't rewrite earlier steps.
    steps.push({ op, state: structuredClone(state), caption });
  };
  record("init", initial, caption);
  return { steps, record };
}
