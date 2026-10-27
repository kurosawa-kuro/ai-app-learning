// 配色の読みやすさの検査（WCAG 2.1 AA）。admin-theme.html の色の値を読み、文字と背景の組み合わせのコントラスト比を計算する。
// 本文・小さい文字は 4.5:1、大きい文字・線やアイコンなど文字以外は 3:1。
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { GAS_DIR } from "./gas-mock.mjs"

const theme = readFileSync(join(GAS_DIR, "client/vendor/admin-pico/admin-theme.html"), "utf8")
const token = (name) => {
  const m = new RegExp(String.raw`--${name}:\s*(#[0-9a-fA-F]{6})\s*;`).exec(theme)
  assert.ok(m, `--${name} の値（#rrggbb）が admin-theme.html に無い`)
  return m[1]
}
const gradientStops = (name) => {
  const m = new RegExp(String.raw`--${name}:\s*linear-gradient\(([^;]*)\);`).exec(theme)
  assert.ok(m, `--${name} が無い`)
  return m[1].match(/#[0-9a-fA-F]{6}/g)
}
const luminance = (hex) => {
  const [r, g, b] = hex.slice(1).match(/../g).map((x) => parseInt(x, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
const atLeast = (fg, bg, min, what) => {
  const r = ratio(fg, bg)
  assert.ok(r >= min, `${what}：${fg} / ${bg} = ${r.toFixed(2)}:1（${min}:1 以上が要る）`)
}

test("本文と補助の文字は、地と面の上で 4.5:1 以上", () => {
  for (const bg of ["bg-main", "bg-sub", "bg-header", "bg-hover"]) {
    for (const fg of ["text-main", "text-sub", "text-muted"]) atLeast(token(`admin-${fg}`), token(`admin-${bg}`), 4.5, `${fg} on ${bg}`)
  }
})

test("主ボタンのグラデーションの、どの色の上でも白い文字が 4.5:1 以上", () => {
  for (const name of ["admin-accent-gradient", "admin-accent-gradient-hover"]) {
    for (const stop of gradientStops(name)) atLeast(token("admin-on-accent"), stop, 4.5, `${name} の ${stop}`)
  }
})

test("選択中・危険・成功の文字は、それぞれの地の上で 4.5:1 以上", () => {
  atLeast(token("admin-accent-strong"), token("admin-bg-sub"), 4.5, "accent-strong on 白")
  atLeast(token("admin-accent-strong"), token("admin-accent-soft"), 4.5, "選択中のチップ")
  atLeast(token("admin-danger"), token("admin-bg-sub"), 4.5, "danger on 白")
  atLeast(token("admin-danger"), token("admin-danger-soft"), 4.5, "必須の印・エラー")
  atLeast(token("admin-success"), token("admin-bg-sub"), 4.5, "success on 白")
})

test("キーワードの 4 色のチップは 4.5:1 以上", () => {
  for (const n of [1, 2, 3, 4]) atLeast(token(`admin-pop-${n}-fg`), token(`admin-pop-${n}-bg`), 4.5, `pop-${n}`)
})

test("選択中の枠（accent）は、白い面の上で 3:1 以上（文字以外の基準）", () => {
  atLeast(token("admin-accent"), token("admin-bg-sub"), 3, "accent の枠")
})
