import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createPlayer, type PlayerState } from "../../src/core/player";

describe("createPlayer", () => {
  let changes: PlayerState[];
  const make = (length = 3) => createPlayer(length, (s) => changes.push(s), 100);

  beforeEach(() => {
    changes = [];
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  test("rejects an empty trace", () => {
    expect(() => make(0)).toThrow(RangeError);
  });

  test("starts at step 0, paused, without emitting", () => {
    expect(make().state).toEqual({ index: 0, playing: false });
    expect(changes).toEqual([]);
  });

  test("next, prev and seek clamp to the valid range", () => {
    const p = make();
    p.prev();
    expect(p.state.index).toBe(0);
    p.seek(99);
    expect(p.state.index).toBe(2);
    p.next();
    expect(p.state.index).toBe(2);
    p.seek(1);
    expect(changes.map((c) => c.index)).toEqual([0, 2, 2, 1]);
  });

  test("play advances on each tick and stops at the last step", () => {
    const p = make();
    p.play();
    expect(p.state.playing).toBe(true);
    vi.advanceTimersByTime(100);
    expect(p.state).toEqual({ index: 1, playing: true });
    vi.advanceTimersByTime(100);
    expect(p.state).toEqual({ index: 2, playing: false });
    vi.advanceTimersByTime(500);
    expect(p.state.index).toBe(2);
  });

  test("play from the last step restarts at step 0", () => {
    const p = make();
    p.seek(2);
    p.play();
    expect(p.state).toEqual({ index: 0, playing: true });
  });

  test("play twice does not start a second timer", () => {
    const p = make(5);
    p.play();
    p.play();
    vi.advanceTimersByTime(100);
    expect(p.state.index).toBe(1);
  });

  test("pause and toggle stop and resume playback", () => {
    const p = make();
    p.toggle();
    expect(p.state.playing).toBe(true);
    p.toggle();
    expect(p.state.playing).toBe(false);
    vi.advanceTimersByTime(500);
    expect(p.state.index).toBe(0);
    p.play();
    p.pause();
    expect(p.state.playing).toBe(false);
  });
});
