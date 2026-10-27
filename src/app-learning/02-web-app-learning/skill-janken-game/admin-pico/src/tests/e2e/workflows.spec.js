const { test, expect } = require("@playwright/test");

test.describe("customer and auth flows", () => {
  test("customers page preserves dense desktop table workflow", async ({ page }) => {
    await page.goto("/pages/admin/customers.html");

    await expect(page.getByRole("heading", { level: 1, name: "顧客" })).toBeVisible();
    await expect(page.getByPlaceholder("顧客名、会社名、プランで検索")).toBeVisible();
    await expect(page.locator(".admin-table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Astra Trade" })).toBeVisible();
    await expect(page.getByRole("button", { name: "顧客を追加" })).toBeVisible();
    await expect(page.getByText("1 - 4 / 248 件を表示")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "優先顧客のページ切替" })).toBeVisible();
  });

  test("news page renders card feed and pager", async ({ page }) => {
    await page.goto("/pages/admin/news.html");

    await expect(page.getByRole("heading", { level: 1, name: "ニュース" })).toBeVisible();
    await expect(page.getByPlaceholder("記事ID、見出し、担当者で検索")).toBeVisible();
    await expect(page.locator(".admin-news-feed")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "直近の更新" })).toBeVisible();
    await expect(page.getByText("1 - 6 / 64 件を表示")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "記事一覧のページ切替" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "決算速報: SaaS 市況の見通し" })).toBeVisible();
  });

  test("ajax page renders async job cards and pager", async ({ page }) => {
    await page.route("https://jsonplaceholder.typicode.com/users", async (route, request) => {
      if (request.method() === "POST") {
        const body = JSON.parse(request.postData() || "{}");
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ id: 101, ...body }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            id: 1,
            name: "佐藤 彩夏",
            username: "ayaka",
            email: "ayaka@example.com",
            phone: "03-0000-0001",
            website: "ayaka.example.com",
            company: { name: "Astra Trade" },
          },
          {
            id: 2,
            name: "田中 恒一",
            username: "koji",
            email: "koji@example.com",
            phone: "03-0000-0002",
            website: "koji.example.com",
            company: { name: "Nova Labs" },
          },
        ]),
      });
    });

    await page.route("https://jsonplaceholder.typicode.com/posts", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            userId: 1,
            id: 11,
            title: "最初の投稿",
            body: "投稿本文のサンプルです",
          },
          {
            userId: 2,
            id: 12,
            title: "次の投稿",
            body: "二件目の本文です",
          },
        ]),
      });
    });

    await page.route("https://jsonplaceholder.typicode.com/todos", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { userId: 1, id: 21, title: "未完了Todo", completed: false },
          { userId: 2, id: 22, title: "完了Todo", completed: true },
        ]),
      });
    });

    await page.goto("/pages/admin/ajax.html");

    await expect(page.getByRole("heading", { level: 1, name: "非同期サンプル" })).toBeVisible();
    await expect(page.getByPlaceholder("名前、件名、メール、本文で検索")).toBeVisible();
    await expect(page.locator(".admin-news-feed")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "直近の Ajax レコード" })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "非同期サンプル一覧のページ切替" })).toBeVisible();
    await expect(page.getByText("GET /users")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "佐藤 彩夏 / ayaka" })).toBeVisible();
    await expect(page.locator("#ajax-users-count")).toHaveText("2");
    await expect(page.locator("#ajax-posts-count")).toHaveText("2");
    await expect(page.locator("#ajax-open-todos")).toHaveText("1");
    await page.getByRole("button", { name: "Users" }).click();
    await expect(page.getByText("POST-11")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 3, name: "佐藤 彩夏 / ayaka" })).toBeVisible();

    await page.getByPlaceholder("名前、件名、メール、本文で検索").fill("二件目");
    await expect(page.getByRole("heading", { level: 3, name: "次の投稿" })).toBeVisible();
    await expect(page.getByText("1 - 1 / 1 件を表示")).toBeVisible();

    await page.getByRole("button", { name: "全体" }).click();
    await page.getByPlaceholder("名前、件名、メール、本文で検索").fill("");

    await page.getByLabel("氏名").fill("山田 花子");
    await page.getByLabel("メールアドレス").fill("hanako@example.com");
    await page.getByLabel("補足メモ").fill("POST 検証");
    await page.getByRole("button", { name: "POST 送信" }).click();

    await expect(page.locator("#ajax-created-count")).toHaveText("1");
    await expect(page.getByText("送信成功")).toBeVisible();
    await expect(page.getByRole("heading", { level: 3, name: "山田 花子 を作成送信" })).toBeVisible();
    await expect(page.getByText("1 - 6 / 7 件を表示")).toBeVisible();
  });

  test("orders page preserves operational queue and exception blocks", async ({ page }) => {
    await page.goto("/pages/admin/orders.html");

    await expect(page.getByRole("heading", { level: 1, name: "受注" })).toBeVisible();
    await expect(page.getByPlaceholder("受注番号、顧客名、SKU で検索")).toBeVisible();
    await expect(page.locator(".admin-table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Astra Trade" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "対応が必要な受注" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "受注明細プレビュー" })).toBeVisible();
    await expect(page.getByRole("button", { name: "受注を作成" })).toBeVisible();
    await expect(page.getByText("1 - 4 / 84 件を表示")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "受注一覧のページ切替" })).toBeVisible();
  });

  test("todo page preserves task queue workflow", async ({ page }) => {
    await page.goto("/pages/admin/todo.html");

    await expect(page.getByRole("heading", { level: 1, name: "Todo" })).toBeVisible();
    await expect(page.getByPlaceholder("タスク名、担当者、案件名で検索")).toBeVisible();
    await expect(page.locator(".admin-table")).toBeVisible();
    await expect(page.getByRole("cell", { name: "Astra Trade" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "期限超過の Todo" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Todo プレビュー" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Todo を追加" })).toBeVisible();
    await expect(page.getByText("1 - 4 / 72 件を表示")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Todo 一覧のページ切替" })).toBeVisible();
  });

  test("settings page exposes desktop configuration controls", async ({ page }) => {
    await page.goto("/pages/admin/settings.html");

    await expect(page.getByRole("heading", { level: 1, name: "設定" })).toBeVisible();
    await expect(page.getByLabel("ワークスペース名")).toBeVisible();
    await expect(page.getByLabel("サポートメール")).toBeVisible();
    await expect(page.getByLabel("問い合わせ一次窓口")).toBeVisible();
    await expect(page.getByLabel("連携先 Webhook")).toBeVisible();
    await expect(page.getByRole("button", { name: "変更を保存" })).toBeVisible();
    await expect(page.getByText("ダーク固定")).toBeVisible();
  });

  test("signin page renders dark-only auth entrypoint", async ({ page }) => {
    await page.goto("/pages/auth/signin.html");

    await expect(page.getByRole("heading", { level: 1, name: "ログイン" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("パスワード")).toBeVisible();
    await expect(page.getByText("ダーク固定")).toBeVisible();
  });

  test("signup page exposes invitation-based account creation", async ({ page }) => {
    await page.goto("/pages/auth/signup.html");

    await expect(page.getByRole("heading", { level: 1, name: "アカウント作成" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByLabel("氏名")).toBeVisible();
    await expect(page.getByLabel("権限")).toBeVisible();
    await expect(page.getByRole("button", { name: "アカウント作成" })).toBeVisible();
  });

  test("reset-password page keeps recovery action simple", async ({ page }) => {
    await page.goto("/pages/auth/reset-password.html");

    await expect(page.getByRole("heading", { level: 1, name: "パスワード再設定" })).toBeVisible();
    await expect(page.getByLabel("メールアドレス")).toBeVisible();
    await expect(page.getByRole("button", { name: "再設定リンクを送信" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ログインへ戻る" })).toBeVisible();
  });

  test("404 page provides recovery links", async ({ page }) => {
    await page.goto("/pages/errors/404.html");

    await expect(page.getByRole("heading", { level: 1, name: "ページが見つかりません" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ダッシュボードへ戻る" })).toBeVisible();
    await expect(page.getByRole("link", { name: "分析画面を開く" })).toBeVisible();
    await expect(page.getByText("移行状態")).toBeVisible();
  });
});
