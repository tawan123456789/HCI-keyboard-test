import { test, expect } from "@playwright/test";
import { getPool } from "../src/keyboard/definitions.js";
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
