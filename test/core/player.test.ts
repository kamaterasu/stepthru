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

  test("rejects an interval that is not above 0", () => {
    for (const ms of [0, -5, NaN]) expect(() => createPlayer(3, () => {}, ms)).toThrow(RangeError);
  });

  test("setSpeed changes the interval, even mid-playback", () => {
    const p = createPlayer(10, (s) => changes.push(s), 100);
    p.play();
    p.setSpeed(2);
    expect(p.state).toEqual({ index: 0, playing: true, speed: 2 });
    vi.advanceTimersByTime(100);
    expect(p.state.index).toBe(2);
    expect(() => p.setSpeed(0)).toThrow(RangeError);
    expect(() => p.setSpeed(Infinity)).toThrow(RangeError);
    p.pause();
  });

  test("starts at step 0, paused, without emitting", () => {
    expect(make().state).toEqual({ index: 0, playing: false, speed: 1 });
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
    expect(p.state).toEqual({ index: 1, playing: true, speed: 1 });
    vi.advanceTimersByTime(100);
    expect(p.state).toEqual({ index: 2, playing: false, speed: 1 });
    vi.advanceTimersByTime(500);
    expect(p.state.index).toBe(2);
  });

  test("moving during playback gives the new step a full interval", () => {
    const p = make(10);
    p.play();
    vi.advanceTimersByTime(90);
    p.seek(5);
    vi.advanceTimersByTime(90);
    expect(p.state.index).toBe(5);
    vi.advanceTimersByTime(10);
    expect(p.state.index).toBe(6);
    p.pause();
  });

  test("play from the last step restarts at step 0", () => {
    const p = make();
    p.seek(2);
    p.play();
    expect(p.state).toEqual({ index: 0, playing: true, speed: 1 });
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
