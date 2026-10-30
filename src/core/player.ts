export interface PlayerState {
  readonly index: number;
  readonly playing: boolean;
}

export interface Player {
  readonly state: PlayerState;
  seek(index: number): void;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  toggle(): void;
}

/** Moves through `length` steps and reports every change. Has no DOM, so it works anywhere. */
export function createPlayer(
  length: number,
  onChange: (state: PlayerState) => void,
  intervalMs = 800,
): Player {
  if (length < 1) throw new RangeError("player needs at least one step");
  const last = length - 1;
  let index = 0;
  let timer: ReturnType<typeof setInterval> | undefined;

  const state = (): PlayerState => ({ index, playing: timer !== undefined });
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const seek = (i: number) => {
    index = Math.min(Math.max(i, 0), last);
    if (index === last) stop();
    onChange(state());
  };
  const pause = () => {
    stop();
    onChange(state());
  };
  const play = () => {
    if (timer !== undefined) return;
    if (index === last) index = 0;
    timer = setInterval(() => seek(index + 1), intervalMs);
    onChange(state());
  };

  return {
    get state() {
      return state();
    },
    seek,
    next: () => seek(index + 1),
    prev: () => seek(index - 1),
    play,
    pause,
    toggle: () => (timer === undefined ? play() : pause()),
  };
}
