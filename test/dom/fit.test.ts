// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { fitTo, largest, svgSize } from "../../src/dom/fit";

describe("svgSize", () => {
  test("reads width and height from the root svg", () => {
    expect(svgSize('<svg width="120" height="40.5" viewBox="0 0 120 40.5"><rect width="9" height="9"/></svg>')).toEqual([120, 40.5]);
  });

  test("returns null without a sized root svg", () => {
    expect(svgSize('<svg viewBox="0 0 1 1"><rect width="9" height="9"/></svg>')).toBeNull();
    expect(svgSize("<div>hi</div>")).toBeNull();
  });
});

describe("largest", () => {
  test("takes the widest width and the tallest height", () => {
    expect(largest([[10, 50], [30, 20]])).toEqual([30, 50]);
  });

  test("gives up when any size is unknown", () => {
    expect(largest([[10, 50], null])).toBeNull();
  });
});

describe("fitTo", () => {
  test("grows the svg and centers the drawing across", () => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    fitTo(svg, [100, 40], [140, 60]);
    expect(["width", "height", "viewBox"].map((a) => svg.getAttribute(a))).toEqual(["140", "60", "-20 0 140 60"]);
  });
});
