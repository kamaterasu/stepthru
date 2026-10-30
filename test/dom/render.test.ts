// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render } from "../../src/dom/render";
import { createTrace } from "../../src/core/trace";

const view = (n: number) => `<svg><text>${n}</text></svg>`;

describe("render", () => {
  let el: HTMLElement;
  const text = (selector: string) => el.querySelector(selector)!.textContent;
  const click = (action: string) =>
    el.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  const press = (key: string, target: Element = el) =>
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  beforeEach(() => {
    el = document.createElement("div");
    const t = createTrace(10, "start");
    t.record("add", 20, "add ten");
    t.record("add", 30, "add ten again");
    render(t, el, { view });
  });

  test("uses the trace's own view when no view is passed", () => {
    const own = document.createElement("div");
    render({ ...createTrace(7), view }, own);
    expect(own.querySelector(".stepthru-figure")!.textContent).toBe("7");
  });

  test("throws when there is no view at all", () => {
    expect(() => render(createTrace(1), document.createElement("div"))).toThrow(TypeError);
  });

  test("shows the first step with its caption and counter", () => {
    expect(el.classList.contains("stepthru")).toBe(true);
    expect(el.tabIndex).toBe(0);
    expect(text(".stepthru-figure")).toBe("10");
    expect(text(".stepthru-caption")).toBe("start");
    expect(text(".stepthru-counter")).toBe("1 / 3");
  });

  test("buttons move between steps", () => {
    click("next");
    expect(text(".stepthru-figure")).toBe("20");
    expect(text(".stepthru-caption")).toBe("add ten");
    click("last");
    expect(text(".stepthru-counter")).toBe("3 / 3");
    click("prev");
    expect(text(".stepthru-figure")).toBe("20");
    click("first");
    expect(text(".stepthru-figure")).toBe("10");
  });

  test("play button switches to pause", () => {
    click("toggle");
    const toggle = el.querySelector('[data-action="toggle"]')!;
    expect(toggle.getAttribute("aria-label")).toBe("Pause");
    click("toggle");
    expect(toggle.getAttribute("aria-label")).toBe("Play");
  });

  test("keyboard on the figure moves between steps", () => {
    press("ArrowRight");
    expect(text(".stepthru-figure")).toBe("20");
    press("End");
    expect(text(".stepthru-figure")).toBe("30");
    press("Home");
    expect(text(".stepthru-figure")).toBe("10");
  });

  test("keys on inner controls are left to the controls", () => {
    press("ArrowRight", el.querySelector(".stepthru-scrub")!);
    expect(text(".stepthru-figure")).toBe("10");
  });

  test("the slider seeks to its value", () => {
    const scrub = el.querySelector<HTMLInputElement>(".stepthru-scrub")!;
    expect(scrub.max).toBe("2");
    scrub.value = "2";
    scrub.dispatchEvent(new Event("input"));
    expect(text(".stepthru-figure")).toBe("30");
  });
});

describe("render extras", () => {
  const sized = (w: number) => `<svg width="${w}" height="${w / 2}" viewBox="0 0 ${w} ${w / 2}"></svg>`;
  const make = () => {
    const t = createTrace(100, "start");
    t.record("grow", 200, "bigger");
    const el = document.createElement("div");
    return { el, figure: render(t, el, { view: sized, intervalMs: 100 }) };
  };
  const svgAttrs = (el: HTMLElement) =>
    ["width", "height", "viewBox"].map((a) => el.querySelector(".stepthru-figure svg")!.getAttribute(a));

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  test("every step keeps the size of the largest step", () => {
    const { el, figure } = make();
    expect(svgAttrs(el)).toEqual(["200", "100", "-50 0 200 100"]);
    figure.next();
    expect(svgAttrs(el)).toEqual(["200", "100", "0 0 200 100"]);
  });

  test("captions are announced when stepping, not while playing", () => {
    vi.useFakeTimers();
    const { el, figure } = make();
    const caption = el.querySelector(".stepthru-caption")!;
    expect(caption.getAttribute("aria-live")).toBe("polite");
    figure.play();
    expect(caption.getAttribute("aria-live")).toBe("off");
    vi.advanceTimersByTime(100);
    expect(caption.getAttribute("aria-live")).toBe("polite");
  });

  test("buttons use icons with labels", () => {
    const { el, figure } = make();
    const toggle = el.querySelector('[data-action="toggle"]')!;
    expect(toggle.querySelector("svg[aria-hidden]")).not.toBeNull();
    const before = toggle.innerHTML;
    figure.play();
    expect(toggle.innerHTML).not.toBe(before);
    figure.pause();
  });

  test("pauses when the figure leaves the screen", () => {
    let report: (entries: { isIntersecting: boolean }[]) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal("IntersectionObserver", class {
      constructor(callback: typeof report) { report = callback; }
      observe() {}
      disconnect = disconnect;
    });
    const { figure } = make();
    figure.play();
    report([{ isIntersecting: true }]);
    expect(figure.state.playing).toBe(true);
    report([{ isIntersecting: false }]);
    expect(figure.state.playing).toBe(false);
    figure.destroy();
    expect(disconnect).toHaveBeenCalled();
  });

  test("destroy stops playback and ignores later input", () => {
    vi.useFakeTimers();
    const { el, figure } = make();
    figure.play();
    figure.destroy();
    expect(figure.state.playing).toBe(false);
    el.querySelector<HTMLButtonElement>('[data-action="next"]')!.click();
    vi.advanceTimersByTime(500);
    expect(figure.state.index).toBe(0);
  });
});
