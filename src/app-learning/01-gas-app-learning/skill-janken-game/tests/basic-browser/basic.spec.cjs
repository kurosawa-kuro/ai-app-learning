const { test, expect } = require("@playwright/test");
test("スキルなしの対戦→再読込・PCスマホ", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("準備できました");
  const before = await page.locator("#history article").count();
  await page.locator("#hand").selectOption("rock");
  await page.locator("#play").click();
  await expect(page.locator("#status")).toContainText("対戦を記録");
  await expect(page.locator("#result")).toContainText("グー");
  await page.reload();
  await expect(page.locator("#status")).toContainText("準備できました");
  await expect(page.locator("#history article")).toHaveCount(before + 1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("janken.png"),
    fullPage: true,
  });
});
