const fs = require("node:fs");
const path = require("node:path");
const { Script } = require("node:vm");
const root = path.resolve(__dirname, "..");
const source = path.join(root, "src/basic");
const target = path.join(root, "dist-basic");
const files = [
  "application.js",
  "store.js",
  "web.js",
  "index.html",
  "app.html",
  "bridge.html",
  "style.html",
  "pico.html",
  "appsscript.json",
].sort();
if (JSON.stringify(fs.readdirSync(source).sort()) !== JSON.stringify(files))
  throw new Error("配布ファイルを確認してください。");
const manifest = JSON.parse(
  fs.readFileSync(path.join(source, "appsscript.json"), "utf8"),
);
if (
  manifest.runtimeVersion !== "V8" ||
  manifest.webapp.access !== "MYSELF" ||
  manifest.webapp.executeAs !== "USER_DEPLOYING"
)
  throw new Error("本人限定の公開設定を確認してください。");
fs.mkdirSync(target, { recursive: true });
if (fs.readdirSync(target).some((file) => !files.includes(file)))
  throw new Error(
    "dist-basicに想定外のファイルがあります。自動削除せず確認してください。",
  );
for (const file of files) {
  const content = fs.readFileSync(path.join(source, file), "utf8");
  if (file.endsWith(".js")) new Script(content, { filename: file });
  if (file.endsWith(".html"))
    for (const match of content.matchAll(/<script>([\s\S]*?)<\/script>/g))
      new Script(match[1], { filename: file });
  fs.writeFileSync(path.join(target, file), content);
}
console.log(
  `通常じゃんけん ${files.length}ファイルをdist-basicへ出力しました（未配置）。`,
);
