// The built site in a real browser: every page draws its figure, and the player works the way the README says.
import { expect, test, type Page } from "@playwright/test";

const SITE = "https://kamaterasu.github.io/stepthru/";

/** Every page path the sitemap lists, relative to the site root. */
async function sitemapPaths(page: Page): Promise<string[]> {
  const xml = await (await page.request.get("sitemap.xml")).text();
  return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(([, url]) => url.replace(SITE, ""));
}

const counter = (page: Page) => page.locator("#figure .stepthru-counter");

test("every page draws its figures without errors and fits a phone screen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.setViewportSize({ width: 375, height: 800 });
  const paths = await sitemapPaths(page);
  expect(paths.length).toBeGreaterThan(10);
  for (const path of paths) {
    await page.goto(path);
    await expect(page.locator(".stepthru-figure svg").first(), path).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${path} scrolls sideways`).toBeLessThanOrEqual(0);
  }
  expect(errors).toEqual([]);
});

test("keyboard steps through a figure and the URL follows the step", async ({ page }) => {
  await page.goto("bubble-sort/");
  const total = (await counter(page).textContent())!.split(" / ")[1];
  await page.locator("#figure").focus();
  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText(`2 / ${total}`);
  await expect(page).toHaveURL(/#figure=2$/);
  await page.keyboard.press("End");
  await expect(counter(page)).toHaveText(`${total} / ${total}`);
  await page.keyboard.press("Home");
  await expect(counter(page)).toHaveText(`1 / ${total}`);
});

test("a link to a step opens the figure at that step", async ({ page }) => {
  await page.goto("bubble-sort/#figure=5");
  await expect(counter(page)).toHaveText(/^5 \//);
});

test("swapped cells slide, unless the reader prefers reduced motion", async ({ page }) => {
  // Bubble sort on 5, 2, …: step 2 compares 5 and 2, step 3 swaps them.
  const slidingAfterSwap = async () => {
    await page.goto("bubble-sort/");
    await page.locator("#figure").focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#figure .stepthru-caption")).toHaveText(/^Swap/);
    return page.evaluate(() =>
      [...document.querySelectorAll("#figure [data-key]")].some((el) => el.getAnimations().length > 0));
  };
  expect(await slidingAfterSwap()).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await slidingAfterSwap()).toBe(false);
});

test("a step's highlight fades in without passing through other colors", async ({ page }) => {
  // Chromium once drew bright yellow mid-fade when the animation interpolated colors.
  await page.goto("dijkstra/#figure=12");
  const fill = () => page.evaluate(() => getComputedStyle(document.querySelector('#figure [data-state="active"]')!).fill);
  const during = await fill();
  await page.waitForTimeout(400);
  expect(during).toBe(await fill());
});

test("play advances on its own, and the speed button changes the speed", async ({ page }) => {
  await page.goto("bubble-sort/");
  const play = page.locator('#figure [data-action="toggle"]');
  await page.locator('#figure [data-action="speed"]').click();
  await expect(page.locator('#figure [data-action="speed"]')).toHaveText("2×");
  await play.click();
  await expect(play).toHaveAttribute("aria-label", "Pause");
  await expect(counter(page)).not.toHaveText(/^1 \//);
  await play.click();
  await expect(play).toHaveAttribute("aria-label", "Play");
});
