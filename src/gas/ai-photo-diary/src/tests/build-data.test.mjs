// scripts/build-data.mjs のテスト（env/ の検証と書き出し）
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { buildData, parseCsv, OUTPUT, renderGenerated } from "../scripts/build-data.mjs"
import { GAS_DIR } from "./gas-mock.mjs"

const dataDir = join(GAS_DIR, "..", "env")
const real = () => ({
  configText: readFileSync(join(dataDir, "config.yaml"), "utf8"),
  dataText: readFileSync(join(dataDir, "sample-data.yaml"), "utf8"),
  csvText: readFileSync(join(dataDir, "tags.csv"), "utf8"),
})

test("いまの env/ は通り、server/config/generated.js はその書き出しと一致する", () => {
  const built = buildData(real())
  assert.equal(built.APP_CONFIG.app.name, "GAS日記")
  assert.equal(built.APP_DATA.tags.length, 8)
  assert.equal(built.APP_DATA.samplePosts[0].body, "今日はカフェでケーキを食べた。\n窓ぎわの席が空いていて、ゆっくりできた。")
  assert.equal(readFileSync(OUTPUT, "utf8"), renderGenerated(built), "server/config/generated.js が古い。npm run build:data を流す")
})

test("CSV：BOM・CRLF・空行を許し、列の数の違いと引用符は止める", () => {
  assert.deepEqual(parseCsv("﻿id,name\r\n10,カフェ\r\n\r\n11,休日\r\n"), [{ id: "10", name: "カフェ" }, { id: "11", name: "休日" }])
  assert.throws(() => parseCsv("id,name\n10"), /列の数/)
  assert.throws(() => parseCsv('id,name\n10,"a"'), /引用符/)
})

test("壊れたデータは理由つきで止まる", () => {
  const base = real()
  const broken = (patch) => () => buildData({ ...base, ...patch })
  assert.throws(broken({ csvText: "id,name\n10,カフェ\n10,休日\n" }), /tags\.csv の id が重複/)
  assert.throws(broken({ csvText: "id,name\nx,カフェ\n" }), /id は数字/)
  assert.throws(broken({ dataText: base.dataText.replace('tags: ["11"]', 'tags: ["99"]') }), /tags\.csv に無いタグ 99/)
  assert.throws(broken({ dataText: base.dataText.replace("file: sample-c", "file: sample-z") }), /目録に無い写真 sample-z/)
  assert.throws(broken({ dataText: base.dataText.replace("hue: 28", "hue: 400") }), /hue は 0〜360/)
  assert.throws(broken({ configText: base.configText.replace("title: 100", "title: 0") }), /limits\.title/)
  assert.throws(broken({ configText: base.configText.replace("  - books", "  - posts") }), /使用中のシート posts/)
})
