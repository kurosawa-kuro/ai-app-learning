const APP = {
  kind: "janken-basic-v1",
  title: "じゃんけん",
  tables: {
    players: ["id", "name"],
    rounds: [
      "id",
      "player_id",
      "player_hand",
      "cpu_hand",
      "result",
      "points",
      "created_at",
    ],
  },
  seed: { players: [{ id: "P001", name: "プレイヤー" }] },
};
const HANDS = ["rock", "scissors", "paper"];
function result_(player, cpu) {
  return player === cpu
    ? "draw"
    : (HANDS.indexOf(player) + 1) % 3 === HANDS.indexOf(cpu)
      ? "win"
      : "lose";
}
const Operations = {
  overview() {
    const players = Store.read("players"),
      rounds = Store.read("rounds");
    require_(
      players.some((p) => p.id === "P001"),
      "プレイヤーを確認してください。",
    );
    return {
      player: players.find((p) => p.id === "P001"),
      total: rounds.reduce((s, r) => s + int_(r.points, 2, "保存得点"), 0),
      rounds: rounds.slice().reverse(),
    };
  },
  play(input) {
    const id = requestId_(input.requestId);
    require_(
      HANDS.includes(input.hand),
      "グー・チョキ・パーから選んでください。",
    );
    const rounds = Store.read("rounds"),
      existing = rounds.find((r) => r.id === id);
    if (existing) {
      require_(
        existing.player_hand === input.hand,
        "送信済みの手と異なります。",
      );
      return existing;
    }
    require_(
      Store.read("players").some((p) => p.id === "P001"),
      "プレイヤーを確認してください。",
    );
    require_(
      rounds.length < 200,
      "この教材の記録は200回までです。保存した履歴を確認してください。",
    );
    const cpu = HANDS[Math.floor(Math.random() * 3)],
      result = result_(input.hand, cpu),
      row = {
        id,
        player_id: "P001",
        player_hand: input.hand,
        cpu_hand: cpu,
        result,
        points: String(result === "win" ? 2 : 1),
        created_at: now_(),
      };
    Store.append("rounds", [row]);
    return row;
  },
};
