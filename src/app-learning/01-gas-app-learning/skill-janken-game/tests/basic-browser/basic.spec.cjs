const { test, expect } = require("@playwright/test");
test("スキルなしの対戦→再読込・PCスマホ", async ({ page }, info) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("準備できました");
  const before = await page.locator("#history article").count();
  await page.locator("#hand").selectOption("rock");
  await page.locator("#play").click();
  await expect(page.locator("#status")).toContainText("対戦を記録");
  await expect(page.locator("#result")).toContainText("グー");
  await expect(page.locator("#hand")).toBeDisabled();
  await expect(page.locator("#play")).toBeDisabled();
  await expect(page.locator("#history")).toBeHidden();
  await page.screenshot({
    path: info.outputPath("janken-result.png"),
    fullPage: true,
  });
  await page.locator("#again").click();
  await expect(page.locator("#hand")).toHaveValue("");
  await expect(page.locator("#hand")).toBeFocused();
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

test("応答消失後は同じ手・同じ要求で結果を確認する", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#status")).toContainText("準備できました");
  const before = await page.locator("#history article").count();
  const ids = [];
  await page.route("**/rpc", async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation === "play") {
      ids.push(body.input.requestId);
      if (ids.length === 1) {
        await route.fetch();
        await route.abort();
        return;
      }
    }
    await route.continue();
  });
  await page.locator("#hand").selectOption("paper");
  await page.locator("#play").click();
  await expect(page.locator("#status")).toContainText("通信できません");
  await expect(page.locator("#hand")).toBeDisabled();
  await expect(page.locator("#again")).toBeHidden();
  await page.locator("#play").click();
  await expect(page.locator("#status")).toContainText("対戦を記録");
  expect(ids).toHaveLength(2);
  expect(ids[1]).toBe(ids[0]);
  await expect(page.locator("#history article")).toHaveCount(before + 1);
});
