// env/config.yaml・env/sample-data.yaml・env/tags.csv を検証し、GAS が読める src/server/config/generated.js に書き出す。
// GAS はローカルのファイルを読めないため。設定とデータの正本は env/ で、生成物は手で直さない。
// 使い方: npm run build:data（npm test と npm run push は先にこれを流す）
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { parse as parseYaml } from "yaml"

const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const dataDir = resolve(srcDir, "../env")
export const OUTPUT = join(srcDir, "server", "config", "generated.js")

/** 見出し付きの単純な CSV（引用符・カンマ入りの値は使わない）を読む。 */
export function parseCsv(text) {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "")
  const header = lines.shift().split(",").map((h) => h.trim())
  return lines.map((line, i) => {
    if (line.includes('"')) throw new Error(`tags.csv ${i + 2} 行目：引用符は使えません`)
    const cells = line.split(",").map((c) => c.trim())
    if (cells.length !== header.length) throw new Error(`tags.csv ${i + 2} 行目：列の数が見出しと違います`)
    return Object.fromEntries(header.map((h, j) => [h, cells[j]]))
  })
}

function fail(message) {
  throw new Error(message)
}

function uniqueOrFail(values, label) {
  const seen = new Set()
  values.forEach((v) => {
    if (seen.has(v)) fail(`${label}が重複しています：${v}`)
    seen.add(v)
  })
}

/** 3 つのファイルの中身から APP_CONFIG と APP_DATA を作る。おかしければ理由つきで止める。 */
export function buildData({ configText, dataText, csvText }) {
  const config = parseYaml(configText) || {}
  const data = parseYaml(dataText) || {}
  const tags = parseCsv(csvText)

  // config.yaml
  const app = config.app || fail("config.yaml：app がありません")
  ;["name", "tagline", "mark"].forEach((k) => { if (!app[k]) fail(`config.yaml：app.${k} がありません`) })
  const limits = config.limits || fail("config.yaml：limits がありません")
  ;["title", "body", "excerpt", "tags"].forEach((k) => {
    if (!Number.isInteger(limits[k]) || limits[k] <= 0) fail(`config.yaml：limits.${k} は 1 以上の整数にしてください`)
  })
  ;["requestCacheSeconds", "lockWaitMs"].forEach((k) => {
    if (!Number.isInteger(config[k]) || config[k] <= 0) fail(`config.yaml：${k} は 1 以上の整数にしてください`)
  })
  const providers = config.providers || fail("config.yaml：providers がありません")
  const ai = config.ai
  const uploads = config.uploads
  if (!uploads || !Number.isInteger(uploads.maxImages) || uploads.maxImages < 1 || uploads.maxImages > 3 || uploads.maxBytes !== 1048576 || uploads.maxTotalBytes !== 3145728 || uploads.maxEdge !== 1600 || !Number.isInteger(uploads.retentionHours) || uploads.retentionHours < 24) fail("config.yaml：uploads の上限を確認してください")
  if (!ai || !/^gpt-[a-z0-9.-]+$/.test(ai.model) || !Number.isInteger(ai.maxOutputTokens) || ai.maxOutputTokens < 256 || ai.maxOutputTokens > 8192) fail("config.yaml：ai のモデル・出力上限を確認してください")
  ;["photo", "draft"].forEach((k) => { if (typeof providers[k] !== "string" || !providers[k]) fail(`config.yaml：providers.${k} がありません`) })
  const retiredSheets = config.retiredSheets || []
  if (!Array.isArray(retiredSheets)) fail("config.yaml：retiredSheets は一覧にしてください")
  const tableNames = ["posts", "images", "tags", "post_tags"]
  retiredSheets.forEach((n) => { if (tableNames.includes(n)) fail(`config.yaml：使用中のシート ${n} は retiredSheets に入れられません`) })

  // tags.csv（タグマスター）
  if (tags.length === 0) fail("tags.csv：タグが 1 つもありません")
  tags.forEach((t, i) => {
    if (!/^\d+$/.test(t.id || "")) fail(`tags.csv ${i + 2} 行目：id は数字にしてください`)
    if (!t.name) fail(`tags.csv ${i + 2} 行目：name がありません`)
  })
  uniqueOrFail(tags.map((t) => t.id), "tags.csv の id ")
  uniqueOrFail(tags.map((t) => t.name), "tags.csv の name ")

  // sample-data.yaml（写真の目録・サンプル日記・下書き）
  const images = data.images || fail("sample-data.yaml：images がありません")
  images.forEach((img) => {
    if (!img.id || !img.label) fail("sample-data.yaml：images には id と label が要ります")
    if (!Number.isFinite(img.hue) || img.hue < 0 || img.hue > 360) fail(`sample-data.yaml：images ${img.id} の hue は 0〜360 にしてください`)
  })
  uniqueOrFail(images.map((i) => i.id), "sample-data.yaml の写真の id ")
  const imageIds = new Set(images.map((i) => i.id))
  const tagIds = new Set(tags.map((t) => t.id))

  const samplePosts = (data.samplePosts || []).map((p) => {
    const where = `sample-data.yaml：samplePosts ${p.id}`
    if (!p.id || !p.title || !p.body) fail(`${where}：id・title・body が要ります`)
    if (!Number.isFinite(p.hoursAgo) || p.hoursAgo < 0) fail(`${where}：hoursAgo は 0 以上の数にしてください`)
    const postImages = (p.images || []).map((img) => {
      if (!imageIds.has(img.file)) fail(`${where}：目録に無い写真 ${img.file} を使っています`)
      return { id: String(img.id), file: img.file }
    })
    const postTags = (p.tags || []).map(String)
    postTags.forEach((t) => { if (!tagIds.has(t)) fail(`${where}：tags.csv に無いタグ ${t} を使っています`) })
    if (String(p.title).length > limits.title) fail(`${where}：タイトルが limits.title を超えています`)
    return { id: String(p.id), title: String(p.title), body: String(p.body), hoursAgo: p.hoursAgo, images: postImages, tags: postTags }
  })
  uniqueOrFail(samplePosts.map((p) => p.id), "samplePosts の id ")
  uniqueOrFail(samplePosts.flatMap((p) => p.images.map((i) => i.id)), "samplePosts の写真の id ")

  const draft = data.draft || fail("sample-data.yaml：draft がありません")
  if (!draft.title || !draft.body) fail("sample-data.yaml：draft には title と body が要ります")

  return {
    APP_CONFIG: { app, limits, ai, uploads, providers: { photo: providers.photo, draft: providers.draft }, requestCacheSeconds: config.requestCacheSeconds, lockWaitMs: config.lockWaitMs, retiredSheets },
    APP_DATA: {
      images: images.map((i) => ({ id: i.id, label: String(i.label), hue: i.hue })),
      tags: tags.map((t) => ({ id: t.id, name: t.name })),
      samplePosts,
      draft: { title: String(draft.title), body: String(draft.body) },
    },
  }
}

export function renderGenerated({ APP_CONFIG, APP_DATA }) {
  return [
    "// 自動生成：src/scripts/build-data.mjs（npm run build:data）。手で直さない。読むのは server/config/settings.js だけ。",
    "// 正本は env/config.yaml・env/sample-data.yaml・env/tags.csv。",
    `const APP_CONFIG = ${JSON.stringify(APP_CONFIG, null, 2)}`,
    "",
    `const APP_DATA = ${JSON.stringify(APP_DATA, null, 2)}`,
    "",
  ].join("\n")
}

/** 明示した文体・内容ルールの箇条書きだけを採用。背景情報や認証情報は取り込まない。 */
export function buildPreferences(markdown) {
  let enabled = false
  const rules = []
  for (const line of markdown.split(/\r?\n/)) {
    if (/^##\s/.test(line)) enabled = /^##\s+(文体|内容のルール)\s*$/.test(line)
    else if (enabled && /^-\s+/.test(line)) rules.push(line.replace(/^-\s+/, "").trim())
  }
  const text = rules.join("\n")
  if (Buffer.byteLength(text, "utf8") > 4096) throw new Error("日記の文体設定はUTF-8で4KiB以内にしてください")
  return text
}

// コマンドとして実行されたときだけ書き出す（テストから import したときは書かない）
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const read = (n) => readFileSync(join(dataDir, n), "utf8")
  try {
    const args = process.argv.slice(2)
    if (args.length > 1 || args.some((arg) => !["--check", "--help"].includes(arg))) throw Error("使用法: build-data.mjs [--check|--help]")
    if (args.includes("--help")) {
      console.log("build-data.mjs [--check] : 設定を検証して生成。--check は書き換えず生成物の一致を確認")
      process.exit(0)
    }
    const built = buildData({ configText: read("config.yaml"), dataText: read("sample-data.yaml"), csvText: read("tags.csv") })
    const preferences = buildPreferences(read("diary-preferences.md"))
    const outputs = [
      [OUTPUT, renderGenerated(built)],
      [join(srcDir, "server/config/generated-preferences.js"), "// 自動生成。文体・内容ルールのみ。画面へ渡さない。\nconst DIARY_PREFERENCES = " + JSON.stringify(preferences) + "\n"],
    ]
    for (const [path, content] of outputs) {
      if (args.includes("--check")) {
        if (readFileSync(path, "utf8").replace(/\r\n/g, "\n") !== content) throw Error("生成物が古いです。npm run build:data を実行してください")
      } else writeFileSync(path, content)
    }
    console.log(`server/config/generated.js <- env/（タグ ${built.APP_DATA.tags.length}・写真 ${built.APP_DATA.images.length}・サンプル日記 ${built.APP_DATA.samplePosts.length}）`)
  } catch (e) {
    console.error(`env/ に問題があります：${e.message}`)
    process.exit(1)
  }
}
