const { test, expect } = require("@playwright/test");

test("tablet breakpoint still works without losing navigation", async ({ page }) => {
  await page.goto("/index.html");

  await expect(page.getByRole("heading", { level: 1, name: "運用ダッシュボード" })).toBeVisible();
  await expect(page.getByRole("button", { name: "メニュー" })).toBeVisible();

  await page.getByRole("button", { name: "メニュー" }).click();
  await expect(page.locator(".admin-sidebar")).toBeVisible();
  await expect(page.getByRole("link", { name: "顧客" })).toBeVisible();
});
