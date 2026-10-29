const { test, expect } = require("@playwright/test");
async function ready(page) {
  await expect(page.locator("#status")).not.toHaveText("処理しています…");
  await expect(page.locator("#status")).not.toHaveText("読み込んでいます…");
}
async function screenshot(page, testInfo, name) {
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: testInfo.outputPath(name + ".png"),
    fullPage: true,
  });
}

test("直接注文1800円、明細・再表示・ユーザー切替とPC/スマホ", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await ready(page);
  await page.locator("#user").selectOption("user-haruka");
  await ready(page);
  await page.getByLabel("学習カードセットの数量", { exact: true }).fill("1");
  await page.getByLabel("学びのノートの数量", { exact: true }).fill("1");
  await expect(page.locator("#total")).toHaveText("合計 1,800 円");
  await page
    .getByRole("button", { name: "注文内容を確認する", exact: true })
    .click();
  await expect(page.locator("#confirmation")).toContainText("合計 1,800 円");
  await screenshot(page, testInfo, "shop-confirmation");
  await page.locator("#back-order").click();
  await expect(
    page.getByLabel("学習カードセットの数量", { exact: true }),
  ).toHaveValue("1");
  await page.locator("#submit-order").click();
  await page.locator("#confirm-order").click();
  await expect(page.locator("#status")).toContainText("注文を保存しました");
  await expect(page.locator("#detail")).toContainText("合計 1,800 円");
  await page.reload();
  await ready(page);
  await page.locator("#user").selectOption("user-haruka");
  await ready(page);
  await page
    .getByRole("button", { name: "明細を見る", exact: true })
    .first()
    .click();
  await ready(page);
  await expect(page.locator("#detail")).toContainText("学びのノート");
  await screenshot(page, testInfo, "shop");
  await page.locator("#user").selectOption("user-sora");
  await ready(page);
  await expect(page.locator("#detail-section")).toBeHidden();
  await expect(page.locator("#history-section")).toBeVisible();
  expect(errors).toEqual([]);
});
test("空の注文・通信失敗で入力保持、応答消失後の再送で重複しない", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await ready(page);
  await page.locator("#user").selectOption("user-sora");
  await ready(page);
  await page
    .getByRole("button", { name: "注文内容を確認する", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("商品と数量を指定");
  const before = await page.locator("#history article").count();
  await page.getByLabel("小さなペンケースの数量", { exact: true }).fill("2");
  let lost = false;
  await page.route("**/rpc", async (route) => {
    if (!lost && route.request().postDataJSON().operation === "createOrder") {
      lost = true;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page
    .getByRole("button", { name: "注文内容を確認する", exact: true })
    .click();
  await page.locator("#confirm-order").click();
  await expect(page.locator("#status")).toContainText("通信できません");
  await expect(
    page.getByLabel("小さなペンケースの数量", { exact: true }),
  ).toHaveValue("2");
  await expect(page.locator("#back-order")).toBeDisabled();
  await expect(page.locator("#order-state")).toContainText("注文済みの可能性");
  await page
    .getByRole("button", { name: "この内容で注文を確定する", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("注文を保存しました");
  await expect(page.locator("#detail")).toContainText("合計 1,600 円");
  const rows = await page.evaluate(async () => {
    const r = await fetch("/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        operation: "orders",
        input: { userId: "user-sora" },
      }),
    });
    return (await r.json()).data;
  });
  expect(rows).toHaveLength(before + 1);
});
