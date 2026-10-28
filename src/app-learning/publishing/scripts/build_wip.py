"""Build only the reviewed, introduction-only WIP pages; never copy a source tree."""
import argparse
import html
import json
from pathlib import Path
import re
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]
SITES = {"alias-nightlife": "evening", "alias-general": "paper"}
PUBLIC_FILES = {"index.html", "404.html", "style.css", "icon.svg", "robots.txt", "_headers"}

CSS = """
:root{--bg:#f5f1e9;--ink:#233e3a;--muted:#536963;--accent:#316c58;--line:#cbd1c7;--panel:#e5eada;--round:28px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'Yu Gothic','Hiragino Kaku Gothic ProN',sans-serif;line-height:1.9}
body.evening{--bg:#161d2b;--ink:#f1ecdf;--muted:#c2bfb7;--accent:#d5bb86;--line:#49505b;--panel:#222d40;--round:4px}
a{color:inherit;text-underline-offset:5px}a:focus-visible{outline:3px solid var(--accent);outline-offset:5px}.skip{position:absolute;top:-100px}.skip:focus{top:12px;background:var(--bg);padding:12px;z-index:2}
.wrap{max-width:1120px;margin:auto;padding:0 40px}header{padding:28px 0;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line);gap:20px}.brand{font-size:20px;font-weight:700;text-decoration:none;letter-spacing:.06em}.status{font-size:12px;letter-spacing:.12em;color:var(--muted)}
.hero{display:grid;grid-template-columns:1.4fr 1fr;align-items:center;gap:60px;padding:82px 0 72px}.eyebrow{font-size:13px;color:var(--accent);font-weight:700;letter-spacing:.06em}h1{font-family:'Yu Mincho','Hiragino Mincho ProN',serif;font-size:clamp(36px,4.8vw,62px);font-weight:600;line-height:1.5;letter-spacing:.025em;margin:20px 0 24px}h1 span{display:block}.intro{max-width:530px;color:var(--muted);font-size:15px}.cta{display:inline-block;margin-top:20px;border-bottom:1px solid var(--accent);padding:4px 0;text-decoration:none;font-size:14px}.art{min-height:330px;border:1px solid var(--line);border-radius:var(--round);background:var(--panel);display:grid;place-items:center;position:relative;overflow:hidden}.art svg{width:80%;max-height:300px}.art-label{position:absolute;bottom:18px;left:24px;font-size:11px;letter-spacing:.2em;color:var(--muted)}
section.topics{border-top:1px solid var(--line);padding:48px 0 56px}.section-head{display:flex;align-items:baseline;gap:24px;margin-bottom:28px}.section-head p{font-size:11px;letter-spacing:.12em;color:var(--accent)}h2{font-size:23px;font-weight:600;margin:0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:28px}.topic{border-top:2px solid var(--accent);padding-top:20px}.number{font-size:12px;color:var(--muted)}h3{font-size:20px;margin:12px 0}.topic p,.notice p{font-size:14px;color:var(--muted)}.notice{background:var(--panel);border-radius:var(--round);padding:30px 36px;margin-bottom:48px}.notice h2{font-size:19px}.contact{padding-top:18px;border-top:1px solid var(--line)}footer{border-top:1px solid var(--line);padding:24px 0 36px;font-size:12px;display:flex;justify-content:space-between;gap:20px;color:var(--muted)}
@media(max-width:700px){.wrap{padding:0 24px}header{padding:20px 0}.brand{font-size:17px}.status{font-size:10px}.hero{grid-template-columns:1fr;gap:28px;padding:42px 0}.art{min-height:220px}.art svg{max-height:210px}.grid{grid-template-columns:1fr;gap:24px}.notice{padding:24px}.section-head{display:block}footer{display:block}.hero h1{font-size:37px}}
""".strip()

def load(site, root=ROOT):
    base = root / site
    config = yaml.safe_load((base / "wip.yaml").read_text(encoding="utf-8"))
    expected = {"version": 1, "site_id": site, "mode": "introduction-only", "access": "public", "temporary_identity": True, "content": "content/wip.json", "theme": SITES[site]}
    for key, value in expected.items():
        if config.get(key) != value:
            raise ValueError(f"Invalid WIP configuration: {key}")
    if not re.fullmatch(r"[a-z][a-z0-9-]{2,50}", config.get("project", "")):
        raise ValueError("Invalid hosting project")
    if config.get("url") != f"https://{config['project']}.pages.dev/":
        raise ValueError("URL must be the stable project URL")
    source = base / config["content"]
    if source.is_symlink() or not source.resolve().is_relative_to(base.resolve()):
        raise ValueError("Source must stay within its outlet")
    data = json.loads(source.read_text(encoding="utf-8"))
    if set(data) != {"name", "eyebrow", "headline", "intro", "topics", "notice", "contact"}:
        raise ValueError("Unexpected public content fields")
    for key in set(data) - {"topics"}:
        if not isinstance(data[key], str) or not data[key].strip():
            raise ValueError("Missing public text")
    if not isinstance(data["topics"], list) or not 1 <= len(data["topics"]) <= 4:
        raise ValueError("Expected 1–4 topics")
    for item in data["topics"]:
        if set(item) != {"title", "body"} or any(not isinstance(v, str) or not v.strip() for v in item.values()):
            raise ValueError("Invalid topic")
    raw = json.dumps(data, ensure_ascii=False)
    if any(x in raw.lower() for x in ("https:", "http:", "mailto:", "@", "<", ">", "realname-general", "alias-")):
        raise ValueError("Unexpected identity, markup or outbound contact")
    profile_path = root / "realname-general" / "publish.yaml"
    if profile_path.exists():
        profile = yaml.safe_load(profile_path.read_text(encoding="utf-8")).get("identity_profile", {})
        for field in ("public_name", "brand_name", "contact_email"):
            value = profile.get(field)
            if value and value.casefold() in raw.casefold():
                raise ValueError("Real-name profile in alias outlet")
    if site == "alias-general" and any(x in raw.lower() for x in ("ナイトワーク", "写メ日記", "キャスト", "nightlife", "cast-evaluation")):
        raise ValueError("Specialist information in general outlet")
    other = "alias-general" if site == "alias-nightlife" else "alias-nightlife"
    peer = root / other / "content/wip.json"
    if peer.exists():
        peer_name = json.loads(peer.read_text(encoding="utf-8"))["name"].replace("（仮）", "")
        if peer_name in raw:
            raise ValueError("Cross-outlet identity")
    if "（仮）" not in data["name"] or "準備中" not in data["notice"] or "準備中" not in data["contact"]:
        raise ValueError("WIP must explicitly identify temporary name and unavailable service")
    return config, data

def render(config, data):
    e = html.escape
    if config["theme"] == "evening":
        art = '<circle cx="170" cy="140" r="80" fill="#d5bb86"/><circle cx="202" cy="116" r="70" fill="#222d40"/><path d="M60 245H280M85 265H255" stroke="#77818f"/><circle cx="80" cy="65" r="3" fill="#d5bb86"/>'
    else:
        art = '<rect x="72" y="80" width="150" height="170" rx="12" fill="#b8c9b5" transform="rotate(-12 147 165)"/><rect x="115" y="62" width="150" height="170" rx="12" fill="#f5f1e9" stroke="#6e8e79"/><path d="M140 105H230M140 126H210M140 179l26-25 24 23 22-17 22 37h-94" stroke="#316c58" fill="none" stroke-width="3"/>'
    topics = ''.join(f'<article class="topic"><span class="number">0{i}</span><h3>{e(t["title"])}</h3><p>{e(t["body"])}</p></article>' for i,t in enumerate(data['topics'],1))
    headline = ''.join(f'<span>{e(line)}</span>' for line in data['headline'].splitlines())
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{e(data['name'])} | 準備中</title><meta name="description" content="{e(data['intro'])}"><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/style.css"></head>
<body class="{config['theme']}"><a class="skip" href="#main">本文へ</a><div class="wrap"><header><a class="brand" href="/">{e(data['name'])}</a><span class="status">ただいま準備中</span></header><main id="main"><section class="hero"><div><p class="eyebrow">{e(data['eyebrow'])}</p><h1>{headline}</h1><p class="intro">{e(data['intro'])}</p><a class="cta" href="#topics">準備していること <span aria-hidden="true">↓</span></a></div><div class="art" aria-hidden="true"><svg viewBox="0 0 340 310">{art}</svg><span class="art-label">少しずつ、かたちに。</span></div></section><section class="topics" id="topics"><div class="section-head"><p>これからのご案内</p><h2>準備していること</h2></div><div class="grid">{topics}</div></section><section class="notice" id="notice"><h2>公開について</h2><p>{e(data['notice'])}</p><p class="contact">{e(data['contact'])}</p></section></main><footer><span>{e(data['name'])}</span><span>サービス内容は順次ご案内します。</span></footer></div></body></html>'''

def build(site, root=ROOT):
    config, data = load(site, root)
    output = root / "dist" / site
    output.mkdir(parents=True, exist_ok=True)
    if output.is_symlink() or not output.resolve().is_relative_to((root / "dist").resolve()):
        raise ValueError("Invalid output directory")
    existing = {p.name for p in output.iterdir()}
    if existing - PUBLIC_FILES:
        raise ValueError("Unexpected files in output; refusing to publish")
    icon_color = "#d5bb86" if config["theme"] == "evening" else "#316c58"
    files = {
        "index.html": render(config, data), "style.css": CSS,
        "icon.svg": f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="{icon_color}"/><circle cx="32" cy="32" r="14" fill="none" stroke="white" stroke-width="3"/></svg>',
        "404.html": '<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ページが見つかりません</title><link rel="stylesheet" href="/style.css"><body><main class="wrap"><h1>ページが見つかりません</h1><a href="/">トップページへ</a></main></body></html>',
        "robots.txt": "User-agent: *\nDisallow: /\n",
        "_headers": "/*\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Content-Security-Policy: default-src 'none'; style-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'\n"
    }
    for name, text in files.items():
        target = output / name
        if target.is_symlink():
            raise ValueError("Symlink in output")
        target.write_text(text, encoding="utf-8")
    return output

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser()
    parser.add_argument("--site", choices=list(SITES), required=True)
    args = parser.parse_args()
    print(build(args.site))
