// @vitest-environment happy-dom
import { describe, expect, test } from "vitest";
import { edgeLine, escape, frame, nodeCircle } from "../../src/structures/svg";

const parse = (svg: string) => new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;

describe("escape", () => {
  test("replaces markup characters", () => {
    expect(escape(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
    );
  });

  test("accepts numbers", () => {
    expect(escape(-1.5)).toBe("-1.5");
  });
});

describe("shapes", () => {
  test("nodeCircle draws a circle with an escaped label", () => {
    const svg = parse(`<svg>${nodeCircle([10, 20], "<b>", "active")}</svg>`);
    expect(svg.querySelector("circle")!.getAttribute("data-state")).toBe("active");
    expect(svg.querySelector("circle")!.getAttribute("cx")).toBe("10");
    expect(svg.querySelector("text")!.textContent).toBe("<b>");
  });

  test("edgeLine joins two points", () => {
    const line = parse(`<svg>${edgeLine([1, 2], [3, 4], "marked")}</svg>`).querySelector("line")!;
    expect(["x1", "y1", "x2", "y2", "data-state"].map((a) => line.getAttribute(a))).toEqual(["1", "2", "3", "4", "marked"]);
  });
});

describe("frame", () => {
  const body = { svg: "<circle/>", width: 100, height: 50 };

  test("wraps the body with an escaped aria label", () => {
    const svg = parse(frame(`a "b"`, body));
    expect(svg.getAttribute("viewBox")).toBe("0 0 100 50");
    expect(svg.getAttribute("aria-label")).toBe(`a "b"`);
    expect(svg.querySelector("rect")).toBeNull();
  });

  test("adds a row of boxes below and centers a narrower body", () => {
    const svg = parse(frame("x", body, { label: "queue", items: ["A", "B", "C", "D"] }));
    expect(svg.getAttribute("viewBox")).toBe("0 0 192 98");
    expect(svg.querySelectorAll("rect")).toHaveLength(4);
    expect(svg.querySelector("g")!.getAttribute("transform")).toBe("translate(46 0)");
  });
});
