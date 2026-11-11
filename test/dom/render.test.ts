// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { render, toHTML } from "../../src/dom/render";
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

  test("rendering again into the same element replaces the old figure", () => {
    vi.useFakeTimers();
    const { el, figure: old } = make();
    old.play();
    const t = createTrace(1);
    t.record("a", 2);
    t.record("b", 3);
    const figure = render(t, el, { view: sized, intervalMs: 100 });
    expect(old.state.playing).toBe(false);
    el.querySelector<HTMLButtonElement>('[data-action="next"]')!.click();
    expect(figure.state.index).toBe(1); // one listener, not two
    expect(old.state.index).toBe(0);
    figure.destroy();
    const again = render(t, el, { view: sized });
    el.querySelector<HTMLButtonElement>('[data-action="next"]')!.click();
    expect(again.state.index).toBe(1);
    expect(el.tabIndex).toBe(0);
  });

  test("slides keyed shapes that moved, only between neighboring steps", () => {
    const keyed = (x: number) => `<svg width="100" height="40"><g data-key="a" transform="translate(${x} 0)"></g></svg>`;
    const t = createTrace(0);
    t.record("move", 50);
    t.record("move", 50);
    t.record("move", 0);
    const el = document.createElement("div");
    const animate = vi.fn();
    const original = Element.prototype.animate;
    Element.prototype.animate = animate;
    const figure = render(t, el, { view: keyed });
    figure.next();
    expect(animate).toHaveBeenCalledTimes(1);
    expect(animate.mock.calls[0][0]).toEqual([{ transform: "translate(0px, 0px)" }, { transform: "translate(50px, 0px)" }]);
    figure.next(); // same place: nothing to slide
    expect(animate).toHaveBeenCalledTimes(1);
    figure.seek(0); // a jump: no slide
    expect(animate).toHaveBeenCalledTimes(1);
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    figure.seek(2);
    figure.next();
    expect(animate).toHaveBeenCalledTimes(1);
    Element.prototype.animate = original;
  });

  test("the speed button cycles speeds and shows the current one", () => {
    const { el, figure } = make();
    const button = el.querySelector<HTMLButtonElement>('[data-action="speed"]')!;
    expect(button.textContent).toBe("1×");
    button.click();
    expect(figure.state.speed).toBe(2);
    expect(button.textContent).toBe("2×");
    expect(button.getAttribute("aria-label")).toBe("Speed 2×");
    button.click();
    button.click();
    expect(button.textContent).toBe("0.5×");
  });

  test("buttons name their keyboard shortcut, and arrows work while a button has focus", () => {
    const { el } = make();
    const next = el.querySelector<HTMLButtonElement>('[data-action="next"]')!;
    expect(next.getAttribute("aria-keyshortcuts")).toBe("ArrowRight");
    expect(next.title).toBe("Next step (→)");
    next.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(el.querySelector(".stepthru-counter")!.textContent).toBe("2 / 2");
  });

  test("space on a focused button is left to the button", () => {
    const { el, figure } = make();
    const next = el.querySelector<HTMLButtonElement>('[data-action="next"]')!;
    next.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(figure.state.playing).toBe(false);
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

describe("code, variables, labels and toHTML", () => {
  const code = "let a = 1;\nlet b = <2>;\n";
  const make = () => {
    const t = createTrace(1, "start");
    t.at(1);
    t.watch({ a: 1, name: "x<y" });
    t.record("one", 2, "line one");
    t.at(2);
    t.watch({ a: undefined });
    t.record("two", 3, "line two");
    return t;
  };
  const current = (el: Element) => [...el.querySelectorAll(".stepthru-line.is-current")].map((l) => l.textContent);
  const vars = (el: Element) => [...el.querySelectorAll(".stepthru-vars div")].map((d) => d.textContent);

  test("shows the code and highlights the current step's line", () => {
    const el = document.createElement("div");
    const figure = render(make(), el, { view, code });
    expect([...el.querySelectorAll(".stepthru-line")].map((l) => l.textContent)).toEqual(["let a = 1;", "let b = <2>;"]);
    expect(current(el)).toEqual([]);
    figure.next();
    expect(current(el)).toEqual(["let a = 1;"]);
    expect(el.querySelector(".is-current")!.getAttribute("aria-current")).toBe("step");
    figure.next();
    expect(current(el)).toEqual(["let b = <2>;"]);
    expect(el.querySelectorAll("[aria-current]")).toHaveLength(1);
  });

  test("scrolls the code panel, not the page, to keep the current line in view", () => {
    const el = document.createElement("div");
    const lines = Array.from({ length: 40 }, (_, i) => `line ${i + 1}`).join("\n");
    const t = createTrace(0);
    t.at(30);
    t.record("far", 1);
    t.at(1);
    t.record("near", 2);
    render(t, el, { view, code: lines });
    const box = el.querySelector<HTMLElement>(".stepthru-code")!;
    Object.defineProperty(box, "clientHeight", { value: 100 });
    el.querySelectorAll<HTMLElement>(".stepthru-line").forEach((line, i) => {
      Object.defineProperty(line, "offsetTop", { value: i * 20 });
      Object.defineProperty(line, "offsetHeight", { value: 20 });
    });
    el.querySelector<HTMLButtonElement>('[data-action="next"]')!.click();
    expect(box.scrollTop).toBe(29 * 20 + 20 - 100);
    el.querySelector<HTMLButtonElement>('[data-action="next"]')!.click();
    expect(box.scrollTop).toBe(0);
  });

  test("shows each step's variables, escaped, and hides undefined ones", () => {
    const el = document.createElement("div");
    const figure = render(make(), el, { view });
    expect(vars(el)).toEqual([]);
    figure.next();
    expect(vars(el)).toEqual(["a1", 'name"x<y"']);
    figure.next();
    expect(vars(el)).toEqual(['name"x<y"']);
  });

  test("shows values JSON cannot, and never throws", () => {
    const t = createTrace(1);
    const cyclic: Record<string, unknown> = { v: 1 };
    cyclic.self = cyclic;
    t.watch({ big: 10n, nan: NaN, map: new Map([["a", 1]]), set: new Set([2]), s: "x", cyclic });
    t.record("a", 2);
    const el = document.createElement("div");
    render(t, el, { view }).next();
    expect(vars(el)).toEqual(["big10n", "nanNaN", 'map{"a":1}', "set[2]", 's"x"', "cyclic[circular]"]);
  });

  test("rejects a step tagged past the end of the code", () => {
    const t = createTrace(1);
    t.at(3);
    t.record("a", 2);
    expect(() => toHTML(t, { view, code: "a\nb\n" })).toThrow(/line 3.*2 lines/);
    expect(() => toHTML(t, { view })).not.toThrow();
  });

  test("rejects a trace with no steps", () => {
    expect(() => toHTML({ ...createTrace(1), steps: [] }, { view })).toThrow(/no steps/);
  });

  test("leaves out the panels when nothing uses them", () => {
    const el = document.createElement("div");
    render(createTrace(1), el, { view });
    expect(el.querySelector(".stepthru-vars, .stepthru-code")).toBeNull();
  });

  test("labels replace the default control text", () => {
    const el = document.createElement("div");
    const figure = render(make(), el, { view, labels: { next: "Дараах алхам", play: "Тоглуулах", pause: "Зогсоох" } });
    const label = (action: string) => el.querySelector(`[data-action="${action}"]`)!.getAttribute("aria-label");
    expect(label("next")).toBe("Дараах алхам");
    expect(label("toggle")).toBe("Тоглуулах");
    expect(label("prev")).toBe("Previous step");
    figure.play();
    expect(label("toggle")).toBe("Зогсоох");
    figure.destroy();
  });

  test("toHTML matches the live figure's first step, with the controls hidden", () => {
    const html = toHTML(make(), { view, code });
    const box = document.createElement("div");
    box.innerHTML = html;
    expect(box.querySelector(".stepthru-figure")!.textContent).toBe("1");
    expect(box.querySelector(".stepthru-caption")!.textContent).toBe("start");
    expect(box.querySelector(".stepthru-controls")!.hasAttribute("hidden")).toBe(true);
    expect(box.querySelectorAll(".stepthru-line")).toHaveLength(2);

    const live = document.createElement("div");
    render(make(), live, { view, code });
    expect(live.querySelector(".stepthru-controls")!.hasAttribute("hidden")).toBe(false);
    expect(live.querySelector(".stepthru-figure")!.innerHTML).toBe(box.querySelector(".stepthru-figure")!.innerHTML);
  });

  test("toHTML draws only the first step; render keeps no markup, drawing each step it shows", () => {
    const t = createTrace(1);
    for (let i = 2; i <= 50; i++) t.record("add", i);
    let calls = 0;
    const counted = (n: number) => (calls++, view(n));
    toHTML(t, { view: counted });
    expect(calls).toBe(1);
    calls = 0;
    const figure = render(t, document.createElement("div"), { view: counted });
    expect(calls).toBe(50 + 1 + 1); // sizes, the initial markup, the first update
    figure.next();
    expect(calls).toBe(53);
  });

  test("toHTML needs no DOM and escapes the caption", () => {
    const t = createTrace(1, "<b>bold</b>");
    expect(toHTML(t, { view })).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });

  test("toHTML throws without a view", () => {
    expect(() => toHTML(createTrace(1))).toThrow(TypeError);
  });
});
