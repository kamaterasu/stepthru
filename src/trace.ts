export interface Step<S> {
  readonly op: string;
  readonly state: S;
  readonly caption: string;
}

export interface Trace<S> {
  readonly steps: readonly Step<S>[];
  record(op: string, state: S, caption?: string): void;
}

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
