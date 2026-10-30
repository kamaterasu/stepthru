/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const css = readFileSync(new URL("../../src/styles/theme.css", import.meta.url), "utf8");

// Every rule body that declares a --stepthru-* variable, with the selector in front of it.
const declaringSelectors = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, , body]) => /--stepthru-[\w-]+\s*:/.test(body))
  .map(([, selector]) => selector.replace(/\/\*[\s\S]*?\*\//g, "").trim());

test("variables are only declared on :where(:root), so host pages can override them", () => {
  expect(declaringSelectors.length).toBeGreaterThan(0);
  expect(new Set(declaringSelectors)).toEqual(new Set([":where(:root)"]));
});

test("light and dark defaults declare the same variables", () => {
  const blocks = [...css.matchAll(/:where\(:root\)\s*\{([^}]*)\}/g)].map(([, body]) =>
    [...body.matchAll(/(--stepthru-[\w-]+)\s*:/g)].map(([, name]) => name).sort(),
  );
  expect(blocks).toHaveLength(2);
  expect(blocks[0]).toEqual(blocks[1]);
});
