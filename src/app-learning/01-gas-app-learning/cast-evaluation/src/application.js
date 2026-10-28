const APP = {
  kind: "cast-evaluation-cr-v1",
  title: "キャスト評価",
  tables: {
    members: ["id", "name", "active", "created_at"],
    daily_records: [
      "id",
      "member_id",
      "business_date",
      "drinks",
      "bottles",
      "nominations",
      "accompaniments",
      "sales",
      "created_at",
    ],
    evaluation_rules: ["category", "unit", "points", "enabled"],
  },
  seed: {
    members: [
      {
        id: "member-aoi",
        name: "教材 あおい",
        active: "true",
        created_at: "2026-10-01 09:00:00",
      },
      {
        id: "member-sakura",
        name: "教材 さくら",
        active: "true",
        created_at: "2026-10-01 09:00:00",
      },
    ],
    evaluation_rules: [
      { category: "DRINK", unit: "1", points: "1", enabled: "true" },
      { category: "BOTTLE", unit: "1", points: "3", enabled: "true" },
      { category: "NOMINATION", unit: "1", points: "5", enabled: "true" },
      { category: "ACCOMPANIMENT", unit: "1", points: "5", enabled: "true" },
      { category: "SALES", unit: "10000", points: "1", enabled: "false" },
    ],
  },
};
const METRICS = {
  DRINK: "drinks",
  BOTTLE: "bottles",
  NOMINATION: "nominations",
  ACCOMPANIMENT: "accompaniments",
  SALES: "sales",
};
function date_(value, monthOnly) {
  require_(
    typeof value === "string" &&
      (monthOnly ? /^\d{4}-\d{2}$/ : /^\d{4}-\d{2}-\d{2}$/).test(value),
    "日付を選択してください。",
  );
  const [year, month, day = 1] = value.split("-").map(Number);
  require_(
    year >= 2000 &&
      year <= 2100 &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= new Date(Date.UTC(year, month, 0)).getUTCDate(),
    "2000〜2100年の正しい日付を指定してください。",
  );
  return value;
}
function rules_(rows) {
  require_(
    rows.length === 5 &&
      new Set(rows.map((r) => r.category)).size === 5 &&
      rows.every((r) => METRICS[r.category]),
    "評価ルールの5項目を確認してください。",
  );
  return rows.map((row) => {
    require_(
      /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(row.unit) &&
        Number(row.unit) > 0 &&
        Number(row.unit) <= 1e9 &&
        /^(0|[1-9]\d*)(\.\d{1,2})?$/.test(row.points) &&
        Number(row.points) <= 1e6 &&
        ["true", "false"].includes(row.enabled),
      "評価ルールの範囲・小数2桁・有効設定を確認してください。",
    );
    return {
      ...row,
      unit: Number(row.unit),
      points: Number(row.points),
      enabled: row.enabled === "true",
    };
  });
}
function rank_(members, records, rules, month) {
  const scores = members
    .map((member) => {
      const totals = {
        drinks: 0,
        bottles: 0,
        nominations: 0,
        accompaniments: 0,
        sales: 0,
      };
      records
        .filter(
          (r) =>
            r.member_id === member.id &&
            r.business_date.startsWith(month + "-"),
        )
        .forEach((row) => {
          Object.keys(totals).forEach((key) => {
            totals[key] += int_(
              row[key],
              key === "sales" ? 1e9 : 1e6,
              "保存済み実績",
            );
          });
        });
      let points = 0;
      rules
        .filter((r) => r.enabled)
        .forEach((rule) => {
          const quantity = totals[METRICS[rule.category]];
          const part =
            rule.category === "SALES"
              ? Math.floor(quantity / rule.unit) * rule.points
              : (quantity * rule.points) / rule.unit;
          points += Math.round(part * 1e12) / 1e12;
        });
      require_(
        Number.isFinite(points) && points <= Number.MAX_SAFE_INTEGER / 100,
        "集計結果が扱える範囲を超えています。",
      );
      return { id: member.id, name: member.name, ...totals, points };
    })
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.sales - a.sales ||
        a.name.localeCompare(b.name, "ja") ||
        a.id.localeCompare(b.id),
    );
  let previous,
    rank = 0;
  return scores.map((row, i) => {
    if (
      !previous ||
      previous.points !== row.points ||
      previous.sales !== row.sales
    )
      rank = i + 1;
    previous = row;
    return { ...row, rank, pointsLabel: row.points.toFixed(2) };
  });
}
const Operations = {
  overview(input) {
    const month = date_(input.month, true),
      members = Store.read("members"),
      records = Store.read("daily_records"),
      rules = rules_(Store.read("evaluation_rules"));
    return {
      members,
      rules,
      month,
      results: rank_(members, records, rules, month),
      records: records
        .filter((r) => r.business_date.startsWith(month + "-"))
        .sort(
          (a, b) =>
            b.business_date.localeCompare(a.business_date) ||
            a.member_id.localeCompare(b.member_id),
        ),
    };
  },
  createMember(input) {
    const id = requestId_(input.requestId),
      name = text_(input.name, 60, "名前"),
      members = Store.read("members"),
      existing = members.find((row) => row.id === id);
    if (existing) {
      require_(
        existing.name === name,
        "送信済みの内容と異なります。入力を確認してください。",
      );
      return existing;
    }
    const row = { id, name, active: "true", created_at: now_() };
    Store.append("members", [row]);
    return row;
  },
  createRecord(input) {
    const row = {
      id: requestId_(input.requestId),
      member_id: text_(input.memberId, 80, "メンバー"),
      business_date: date_(input.businessDate, false),
    };
    Object.values(METRICS).forEach(
      (key) =>
        (row[key] = String(
          int_(
            input[key],
            key === "sales" ? 1e9 : 1e6,
            key === "sales" ? "売上" : "件数",
          ),
        )),
    );
    const records = Store.read("daily_records"),
      old = records.find((r) => r.id === row.id);
    if (old) {
      require_(
        Object.keys(row).every((k) => row[k] === old[k]),
        "送信済みの内容と異なります。入力を確認してください。",
      );
      return old;
    }
    require_(
      Store.read("members").some(
        (m) => m.id === row.member_id && m.active === "true",
      ),
      "在籍中のメンバーを選択してください。",
    );
    require_(
      !records.some(
        (r) =>
          r.member_id === row.member_id &&
          r.business_date === row.business_date,
      ),
      "このメンバー・営業日の実績は登録済みです。一覧で確認してください。",
    );
    row.created_at = now_();
    Store.append("daily_records", [row]);
    return row;
  },
};
