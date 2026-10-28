const test = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto");
const { createHarness } = require("./gas-harness.cjs");
const ok = (result) => {
  assert.equal(result.ok, true, result.error);
  return result.data;
};

const order = (overrides = {}) => ({
  requestId: randomUUID(),
  userId: "user-haruka",
  items: [
    { productId: "product-cards", price: 1200, quantity: 1 },
    { productId: "product-notebook", price: 600, quantity: 1 },
  ],
  ...overrides,
});
test("1800円の直接注文・再読込・注文者別表示・明細", () => {
  const h = createHarness(),
    saved = ok(h.rpc("createOrder", order()));
  assert.equal(saved.total, 1800);
  assert.equal(saved.items.length, 2);
  assert.equal(ok(h.rpc("orders", { userId: "user-haruka" })).length, 1);
  assert.equal(ok(h.rpc("orders", { userId: "user-sora" })).length, 0);
  assert.equal(
    ok(h.rpc("detail", { id: saved.id, userId: "user-haruka" })).total,
    1800,
  );
  assert.equal(
    h.rpc("detail", { id: saved.id, userId: "user-sora" }).ok,
    false,
  );
});
test("商品名・価格が変わっても過去の注文は当時の値。再送も同一注文", () => {
  const h = createHarness(),
    payload = order(),
    saved = ok(h.rpc("createOrder", payload));
  h.rows("products")[1][1] = "改名後";
  h.rows("products")[1][2] = "2000";
  const replay = ok(h.rpc("createOrder", payload));
  assert.equal(replay.id, saved.id);
  assert.equal(replay.total, 1800);
  assert.equal(
    replay.items.find((i) => i.product_id === "product-cards").product_name,
    "学習カードセット",
  );
  assert.equal(h.rows("orders").length, 2);
  assert.equal(h.rpc("createOrder", order()).ok, false);
});
test("数量・商品・ユーザー・改ざん価格・同じIDでの内容変更を拒否", () => {
  const h = createHarness(),
    payload = order();
  ok(h.rpc("createOrder", payload));
  assert.equal(
    h.rpc("createOrder", { ...payload, userId: "user-sora" }).ok,
    false,
  );
  for (const items of [
    [],
    [{ productId: "missing", price: 100, quantity: 1 }],
    [{ productId: "product-cards", price: 1200, quantity: 0 }],
    [{ productId: "product-cards", price: 1, quantity: 1 }],
    [{ productId: "product-cards", price: 1200, quantity: 1.5 }],
    [payload.items[0], payload.items[0]],
  ])
    assert.equal(h.rpc("createOrder", order({ items })).ok, false);
  assert.equal(h.rpc("createOrder", order({ userId: "missing" })).ok, false);
  assert.equal(h.rows("orders").length, 2);
});
test("明細のみ保存後に失敗しても、再送で親を確定し明細を重複させない", () => {
  const h = createHarness(),
    payload = order();
  h.failNext("orders", "before");
  assert.equal(h.rpc("createOrder", payload).ok, false);
  assert.equal(ok(h.rpc("orders", { userId: "user-haruka" })).length, 0);
  assert.equal(h.rows("order_items").length, 3);
  ok(h.rpc("createOrder", payload));
  assert.equal(h.rows("order_items").length, 3);
  assert.equal(h.rows("orders").length, 2);
});
test("親保存後の応答失敗も再送で重複しない", () => {
  const h = createHarness(),
    payload = order();
  h.failNext("orders", "after");
  assert.equal(h.rpc("createOrder", payload).ok, false);
  assert.equal(h.isLocked(), false);
  ok(h.rpc("createOrder", payload));
  assert.equal(h.rows("orders").length, 2);
});
test("明細の一部だけ残った場合も不足行だけ保存する", () => {
  const h = createHarness(),
    payload = order();
  h.failNext("orders", "before");
  h.rpc("createOrder", payload);
  h.rows("order_items").pop();
  ok(h.rpc("createOrder", payload));
  assert.equal(h.rows("order_items").length, 3);
});

test("初期化の再実行は非破壊。登録済み表の欠落は再作成しない", () => {
  const h = createHarness(),
    before = JSON.stringify(h.rows("users"));
  h.initialize();
  assert.equal(JSON.stringify(h.rows("users")), before);
  h.sheets.delete("users");
  assert.throws(() => h.initialize());
  assert.equal(h.sheets.has("users"), false);
});
test("未初期化と列不整合は停止。公開操作は許可したものだけ", () => {
  const h = createHarness(undefined, false);
  assert.equal(h.rpc("catalog").ok, false);
  h.initialize();
  h.rows("users")[0][0] = "wrong";
  assert.throws(() => h.initialize());
  assert.equal(h.rpc("toString").ok, false);
  assert.equal(h.rpc("initializeApp").ok, false);
});
