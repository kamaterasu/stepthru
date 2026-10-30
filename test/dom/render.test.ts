// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";
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
