const { test, expect } = require("@playwright/test");

test.describe("desktop admin shell", () => {
  test("dashboard shows desktop-first navigation and chart area", async ({ page }) => {
    await page.goto("/index.html");

    await expect(page.getByRole("heading", { level: 1, name: "運用ダッシュボード" })).toBeVisible();
    await expect(page.getByRole("button", { name: "メニュー" })).toBeHidden();
    await expect(page.locator(".admin-sidebar")).toBeVisible();
    await expect(page.getByRole("link", { name: "分析" })).toBeVisible();
    await expect(page.locator("#dashboard-revenue-trend")).toBeVisible();
  });

  test("analytics keeps key charts and desktop controls visible", async ({ page }) => {
    await page.goto("/pages/admin/analytics.html");

    await expect(page.getByRole("heading", { level: 1, name: "分析" })).toBeVisible();
    await expect(page.getByRole("button", { name: "CSV 出力" })).toBeVisible();
    await expect(page.locator("#analytics-traffic-trend")).toBeVisible();
    await expect(page.locator("#analytics-channel-share")).toBeVisible();
    await expect(page.locator(".admin-sidebar")).toBeVisible();
  });
});
