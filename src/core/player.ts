export interface PlayerState {
  readonly index: number;
  readonly playing: boolean;
  /** Playback speed multiplier. 1 plays one step per interval, 2 twice as fast. */
  readonly speed: number;
}

export interface Player {
  readonly state: PlayerState;
  seek(index: number): void;
  next(): void;
  prev(): void;
  play(): void;
  pause(): void;
  toggle(): void;
  /** Sets the playback speed multiplier. Takes effect at once, even mid-playback. */
  setSpeed(speed: number): void;
}

/** Moves through `length` steps and reports every change. Has no DOM, so it works anywhere. */
export function createPlayer(
  length: number,
  onChange: (state: PlayerState) => void,
  intervalMs = 800,
): Player {
  if (length < 1) throw new RangeError("player needs at least one step");
  if (!(intervalMs > 0)) throw new RangeError(`intervalMs ${intervalMs} must be above 0`);
  const last = length - 1;
  let index = 0;
  let speed = 1;
  let timer: ReturnType<typeof setInterval> | undefined;

  const state = (): PlayerState => ({ index, playing: timer !== undefined, speed });
  const stop = () => {
    clearInterval(timer);
    timer = undefined;
  };

  const seek = (i: number) => {
    index = Math.min(Math.max(i, 0), last);
    if (index === last) stop();
    // Restart the clock, so the step the reader lands on gets a full interval.
    else if (timer !== undefined) restart();
    onChange(state());
  };
  const pause = () => {
    stop();
    onChange(state());
  };
  function start() {
    timer = setInterval(() => seek(index + 1), intervalMs / speed);
  }
  function restart() {
    stop();
    start();
  }
  const play = () => {
    if (timer !== undefined) return;
    if (index === last) index = 0;
    start();
    onChange(state());
  };
  const setSpeed = (next: number) => {
    if (!(next > 0) || !Number.isFinite(next)) throw new RangeError(`speed ${next} must be above 0`);
    speed = next;
    if (timer !== undefined) restart();
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
    setSpeed,
  };
}
