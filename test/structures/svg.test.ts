import { expect, test } from "vitest";
import { escape } from "../../src/structures/svg";

test("escape replaces markup characters", () => {
  expect(escape(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
    "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;",
  );
});

test("escape accepts numbers", () => {
  expect(escape(-1.5)).toBe("-1.5");
});
