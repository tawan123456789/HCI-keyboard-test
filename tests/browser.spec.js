import { test, expect } from "@playwright/test";
import { getPool } from "../src/keyboard/definitions.js";

test("session completes when randomUUID is unavailable on HTTP", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(crypto, "randomUUID", {value: undefined}));
  await configure(page, 1, ["english"]);
  const display = await page.locator("#target").textContent();
  await page.waitForTimeout(35);
  await answer(page, getPool(["english"]).find(key => key.display === display));
  await expect(page.getByRole("heading", {name: "Your results"})).toBeVisible();
  await expect(page.locator(".session-id")).toContainText(/Session [0-9a-f-]{36}/);
});
async function configure(page, count, enabled) {
  await page.goto("/");
  await page.locator("#trials").fill(String(count));
  for (const box of await page.locator("[name=category]").all()) {
    await box.setChecked(enabled.includes(await box.getAttribute("value")));
  }
  await page.getByRole("button", { name: "Prepare test" }).click();
  await expect(page.getByText("Press any key to start")).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("#target")).toBeVisible();
}
async function answer(page, key) {
  const physical = key.code.replace(/^Key/, "").replace(/^Digit/, "");
  await page.keyboard.press(`${key.shiftRequired ? "Shift+" : ""}${physical}`);
}

test("reveal, skip and final expected-answer mistake report", async ({ page }) => {
  await configure(page, 2, ["english"]);
  await page.waitForTimeout(30);
  await page.keyboard.press("F4"); await page.keyboard.press("F4");
  await page.getByRole("button", {name: "Show answer", exact: true}).click();
  await expect(page.locator("#answer")).not.toBeEmpty();
  await page.getByRole("button", {name: "Skip trial", exact: true}).click();
  await expect(page.locator("#answer")).toBeEmpty();
  await page.waitForTimeout(30);
  await page.getByRole("button", {name: "Skip trial", exact: true}).click();
  await expect(page.getByRole("heading", {name: "Your results"})).toBeVisible();
  await expect(page.locator("#trial-rows")).toContainText("F4 [F4] × 2");
  await expect(page.locator("#trial-rows")).toContainText("Skipped");
  await page.getByRole("button", {name: "Reaction time"}).click();
  await page.screenshot({path: "artifacts/skipped-results.png", fullPage: true});
});

test("every Thai target including mai taikhu completes with physical keys", async ({ page }) => {
  const pool = getPool(["thai"]);
  await configure(page, pool.length, ["thai"]);
  const seen = new Set();
  for (let i = 0; i < pool.length; i++) {
    const display = await page.locator("#target").textContent();
    seen.add(display);
    if (display === "็") {
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({path: "artifacts/thai-target-font.png"});
    }
    await page.waitForTimeout(25);
    await answer(page, pool.find(k => k.display === display));
  }
  expect(seen.has("็")).toBe(true);
  await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
});

test("numpad navigation and digits complete real UI trials; NumLock is not blocked", async ({ page }) => {
  for (const category of ["navigation", "number"]) {
    const pool = getPool([category]);
    await configure(page, pool.length, [category]);
    for (let i = 0; i < pool.length; i++) {
      const display = await page.locator("#target").textContent();
      const binding = pool.find(k => k.display === display).alternativeBindings[0];
      await page.waitForTimeout(25);
      const notBlocked = await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", {code: "NumLock", key: "NumLock", bubbles: true, cancelable: true})));
      expect(notBlocked).toBe(true);
      await page.evaluate(({code, key}) => window.dispatchEvent(new KeyboardEvent("keydown", {code, key: key ?? code.at(-1), location: 3, bubbles: true, cancelable: true})), binding);
    }
    await expect(page.getByRole("heading", { name: "Your results" })).toBeVisible();
    await expect(page.locator("#trial-rows tr")).toHaveCount(pool.length);
  }
});
test("complete Thai and symbol flow, errors, sorting and exports", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await configure(page, 10, ["thai", "symbol"]);
  for (let i = 0; i < 10; i++) {
    await expect(page.locator(".trial-top")).toContainText(
      `Trial ${i + 1} / 10`,
    );
    const display = await page.locator("#target").textContent();
    const key = getPool(["thai", "symbol"]).find((k) => k.display === display);
    await page.waitForTimeout(35);
    if (i === 0) {
      await page.keyboard.press("F4");
      await expect(page.locator("#feedback")).toHaveText("Incorrect");
      await expect(page.locator("#target")).toHaveText(display);
    }
    await answer(page, key);
  }
  await expect(
    page.getByRole("heading", { name: "Your results" }),
  ).toBeVisible();
  await expect(page.locator("#trial-rows tr")).toHaveCount(10);
  await page.getByRole("button", { name: "Reaction time" }).click();
  for (const type of ["CSV", "JSON"]) {
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: type, exact: true }).click();
    const download = await pending;
    await download.saveAs(`artifacts/results.${type.toLowerCase()}`);
    expect(await download.failure()).toBeNull();
  }
  await page.screenshot({
    path: "artifacts/results-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Test again" }).click();
  await expect(page.getByText("Press any key to start")).toBeVisible();
  expect(errors).toEqual([]);
});
test("function keys do not navigate; pause archives and resumes", async ({
  page,
}) => {
  await configure(page, 12, ["function"]);
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(35);
    const display = await page.locator("#target").textContent();
    if (i === 0) {
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
      await expect(
        page.getByRole("button", { name: "Continue test" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Continue test" }).click();
      await page.waitForTimeout(35);
      await expect(page.locator("#target")).toHaveText(display);
    }
    await page.keyboard.press(display);
  }
  await expect(
    page.getByRole("heading", { name: "Your results" }),
  ).toBeVisible();
  await expect(page.locator("#trial-rows")).toContainText("Resumed");
});
test("setup validation and mobile framing", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: "artifacts/setup-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const box of await page.locator("[name=category]").all())
    await box.uncheck();
  await page.getByRole("button", { name: "Prepare test" }).click();
  await expect(page.getByRole("alert")).toContainText("at least one category");
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.screenshot({
    path: "artifacts/setup-desktop.png",
    fullPage: true,
  });
});
