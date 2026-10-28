const test = require("node:test"),
  assert = require("node:assert/strict"),
  { randomUUID } = require("node:crypto"),
  { createHarness } = require("./basic-harness.cjs");
const ok = (r) => {
  assert.equal(r.ok, true, r.error);
  return r.data;
};
test("通常じゃんけん：スキル指定なしで対戦・得点・再読込", () => {
  const h = createHarness();
  const r = ok(h.rpc("play", { requestId: randomUUID(), hand: "rock" }));
  assert.ok(["win", "lose", "draw"].includes(r.result));
  assert.equal(Number(r.points), r.result === "win" ? 2 : 1);
  const view = ok(h.rpc("overview"));
  assert.equal(view.rounds.length, 1);
  assert.equal(view.total, Number(r.points));
});
test("保存後応答失敗でも再送は乱数・加点をやり直さない", () => {
  const h = createHarness(),
    input = { requestId: randomUUID(), hand: "paper" };
  h.failNext("rounds", "after");
  assert.equal(h.rpc("play", input).ok, false);
  const row = ok(h.rpc("play", input));
  assert.equal(ok(h.rpc("overview")).rounds.length, 1);
  assert.equal(ok(h.rpc("play", input)).cpu_hand, row.cpu_hand);
  assert.equal(h.rpc("play", { ...input, hand: "rock" }).ok, false);
});
test("不正な手、他プレイヤー指定は結果に影響しない", () => {
  const h = createHarness();
  assert.equal(h.rpc("play", { requestId: randomUUID(), hand: "x" }).ok, false);
  const r = ok(
    h.rpc("play", {
      requestId: randomUUID(),
      hand: "scissors",
      playerId: "P999",
      points: 999,
    }),
  );
  assert.equal(r.player_id, "P001");
  assert.ok(Number(r.points) <= 2);
});
test("勝敗9組と加点を確認する", () => {
  const hands = ["rock", "scissors", "paper"];
  for (let p = 0; p < 3; p++)
    for (let c = 0; c < 3; c++) {
      const h = createHarness();
      h.setRandom(() => (c + 0.1) / 3);
      const row = ok(
        h.rpc("play", { requestId: randomUUID(), hand: hands[p] }),
      );
      assert.equal(
        row.result,
        p === c ? "draw" : (p + 1) % 3 === c ? "win" : "lose",
      );
      assert.equal(Number(row.points), row.result === "win" ? 2 : 1);
    }
});
