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

test("メンバー・実績のCreate Read、再表示、重複エラーとPC/スマホ", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await ready(page);
  const name = "体験 " + testInfo.project.name;
  await page.getByRole("link", { name: "メンバー", exact: true }).click();
  await page.locator("#name").fill(name);
  await page
    .getByRole("button", { name: "メンバーを追加する", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("メンバーを追加しました");
  await page.getByRole("link", { name: "実績入力", exact: true }).click();
  await page.locator("#member").selectOption({ label: name });
  await page.locator("#date").fill("2026-10-02");
  await page.locator("[name=drinks]").fill("2");
  await page.locator("[name=bottles]").fill("1");
  await page.locator("[name=sales]").fill("12000");
  await page.getByRole("link", { name: "配点", exact: true }).click();
  await expect(page.locator("#record")).toBeHidden();
  await page.getByRole("link", { name: "実績入力", exact: true }).click();
  await expect(page.locator("[name=drinks]")).toHaveValue("2");
  await page
    .getByRole("button", { name: "実績を保存する", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("実績を保存しました");
  await expect(page.locator("#scores").filter({ hasText: name })).toContainText(
    "5.00 pt",
  );
  await expect(page.locator("#scores table")).toBeVisible();
  await expect(page.locator("#summary-context")).toContainText("2026-10");
  await page.getByRole("link", { name: "実績入力", exact: true }).click();
  await page
    .getByRole("button", { name: "実績を保存する", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("登録済み");
  await expect(page.locator("[name=drinks]")).toHaveValue("2");
  await page.reload();
  await ready(page);
  await page.locator("#month").fill("2026-10");
  await page.getByRole("button", { name: "結果を見る", exact: true }).click();
  await ready(page);
  await expect(page.locator("#scores")).toContainText(name);
  await page.getByText("この月の入力済み実績", { exact: true }).click();
  await expect(page.locator("#records")).toContainText("12,000 円");
  await screenshot(page, testInfo, "evaluation");
  expect(errors).toEqual([]);
});

test("メンバー保存の応答消失は入力を固定し同じ要求で確認する", async ({
  page,
}, info) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("link", { name: "メンバー", exact: true }).click();
  const name = "応答確認 " + info.project.name,
    ids = [];
  await page.route("**/rpc", async (route) => {
    const body = route.request().postDataJSON();
    if (body.operation === "createMember") {
      ids.push(body.input.requestId);
      if (ids.length === 1) {
        await route.fetch();
        await route.abort();
        return;
      }
    }
    await route.continue();
  });
  await page.locator("#name").fill(name);
  await page.locator("#member-form button").click();
  await expect(page.locator("#status")).toContainText("保存済みの可能性");
  await expect(page.locator("#name")).toBeDisabled();
  await page.locator("#member-form button").click();
  await expect(page.locator("#status")).toContainText("メンバーを追加しました");
  await expect(page.locator("#name")).toBeEnabled();
  expect(ids).toHaveLength(2);
  expect(ids[0]).toBe(ids[1]);
  await expect(
    page.locator("#member-list li").filter({ hasText: name }),
  ).toHaveCount(1);
});
