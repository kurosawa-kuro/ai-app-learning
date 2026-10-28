"""Check publication inputs. Does not generate, deploy, or authorize a website."""

import argparse
import posixpath
import re
import sys
import unicodedata
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

import yaml


ROOT = Path(__file__).resolve().parents[1]
CHANNELS = {
    "realname-general": ("realname", "general"),
    "alias-nightlife": ("alias", "nightlife"),
    "alias-general": ("alias", "general"),
}
GENERAL_EXCLUDED = ("ナイトワーク", "写メ日記", "キャスト", "cast-evaluation", "nightlife")
LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


class Invalid(ValueError):
    pass


class UniqueSafeLoader(yaml.SafeLoader):
    pass


def unique_mapping(loader, node, deep=False):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if not isinstance(key, str) or key in mapping:
            raise Invalid("YAMLの重複キーまたは文字列以外のキー")
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueSafeLoader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, unique_mapping)


def require(condition, message):
    if not condition:
        raise Invalid(message)


def load(path):
    try:
        value = yaml.load(path.read_text(encoding="utf-8-sig"), Loader=UniqueSafeLoader)
    except (OSError, UnicodeError, yaml.YAMLError, TypeError, ValueError) as exc:
        raise Invalid(f"設定を読めません: {path.name}（値の原文は表示しません）") from exc
    require(isinstance(value, dict) and value.get("version") == 1, "設定のversionは1が必要")
    return value


def strings(value, name):
    require(isinstance(value, list) and all(isinstance(x, str) for x in value), f"{name}は文字列の配列が必要")
    require(len(value) == len(set(value)), f"{name}に重複があります")
    return value


def identity_key(value):
    return "".join(unicodedata.normalize("NFKC", value).casefold().split())


def relative(value):
    require(isinstance(value, str) and bool(value), "パスが未設定")
    path = PurePosixPath(value)
    require(not path.is_absolute() and ".." not in path.parts and "\\" not in value
            and ":" not in value and not any(x.startswith(".") for x in path.parts), "許可外のパス")
    require(path.as_posix() == value and len(path.parts) > 0, "パスは正規化した相対パスを指定")
    return path


def source_path(root, item, site):
    source = relative(item.get("source"))
    require(len(source.parts) >= 3 and source.parts[0] in ("common", site)
            and source.parts[1] in ("content", "assets", "samples"), "別出口または内部資料の参照")
    path = root.joinpath(*source.parts)
    boundary = (root / source.parts[0] / source.parts[1]).resolve()
    require(boundary.is_relative_to(root.resolve()), "素材フォルダーが制作入力の外を指しています")
    require(path.resolve().is_relative_to(boundary), "素材が許可フォルダーの外を指しています")
    require(path.resolve() == path, "素材のリンク・ジャンクション経由の参照は許可しません")
    require(path.is_file(), "素材ファイルがありません")
    # Binary files, archives and rendering require dedicated checks before enabling them.
    require(path.suffix == ".md", "現在の検査対象はMarkdownだけです。別形式は検査追加が必要")
    return path


def check(root, site, ready=False):
    require(site in CHANNELS, "未登録の出口")
    root = root.resolve()
    config = load(root / site / "publish.yaml")
    require(config.get("site_id") == site, "出口IDが配置先と一致しません")
    require((config.get("identity_mode"), config.get("audience")) == CHANNELS[site], "本名公開範囲と題材の組合せが違います")
    require(isinstance(config.get("publication_enabled"), bool), "publication_enabledは真偽値が必要")
    access = config.get("access_mode")
    require(access in ("public", "invited", "undecided"), "公開水準が不正")
    profile = config.get("identity_profile")
    require(isinstance(profile, dict) and profile.get("id") == site, "専用名義設定が必要")
    for field in ("public_name", "brand_name", "contact_email"):
        require(field in profile and (profile[field] is None or isinstance(profile[field], str)), "名義設定は文字列またはnullが必要")
    if site in ("alias-nightlife", "alias-general"):
        peer = "alias-general" if site == "alias-nightlife" else "alias-nightlife"
        peer_profile = load(root / peer / "publish.yaml").get("identity_profile")
        require(isinstance(peer_profile, dict) and peer_profile.get("id") == peer, "もう一方の非開示版の名義設定が不正")
        for field in ("public_name", "contact_email"):
            other = peer_profile.get(field)
            require(other is None or isinstance(other, str), "もう一方の非開示版の名義設定が不正")
            current = profile[field]
            if current and other:
                require(not identity_key(current) or identity_key(current) != identity_key(other), "②と③は別の活動名・連絡先が必要です（値の原文は表示しません）")
    selected = strings(config.get("selected_ids"), "selected_ids")
    require(bool(selected), "選択素材がありません")

    catalog = load(root / "catalog.yaml")
    require(isinstance(catalog.get("materials"), list), "素材台帳がありません")
    materials = {}
    for item in catalog["materials"]:
        require(isinstance(item, dict), "素材はオブジェクトで指定")
        key = item.get("id")
        require(isinstance(key, str) and re.fullmatch(r"[a-z0-9-]+", key) and key not in materials, "素材IDが不正または重複")
        allowed = strings(item.get("allowed_sites"), "allowed_sites")
        require(set(allowed) <= set(CHANNELS), "未知の許可先")
        strings(item.get("dependencies"), "dependencies")
        require(item.get("review_status") in ("draft", "reviewed"), "素材の確認状態が不正")
        relative(item.get("source"))
        relative(item.get("output"))
        materials[key] = item

    resolved, active = {}, set()

    def visit(key):
        require(key in materials, "未知の素材ID")
        require(key not in active, "素材の循環依存")
        if key in resolved:
            return
        item = materials[key]
        require(site in item["allowed_sites"], "許可されていない素材または依存物")
        source_path(root, item, site)
        active.add(key)
        for dep in item["dependencies"]:
            visit(dep)
        active.remove(key)
        resolved[key] = item

    for key in selected:
        visit(key)
    outputs = {}
    for key, item in resolved.items():
        output = item["output"].casefold()
        require(output not in outputs, "出力先が重複しています")
        require(output.endswith(".md"), "Markdown以外の出力は未対応")
        outputs[output] = key

    # Check configured real-name values without echoing the values to logs.
    real_profile = load(root / "realname-general" / "publish.yaml").get("identity_profile", {})
    require(isinstance(real_profile, dict), "本名側の名義設定が不正")
    real_values = [real_profile.get(k) for k in ("public_name", "contact_email")]
    require(all(v is None or isinstance(v, str) for v in real_values), "本名側の公開名・メールの形式が不正")
    if config["identity_mode"] == "alias":
        profile_text = "\n".join(profile.get(k) or "" for k in ("public_name", "brand_name", "contact_email")).casefold()
        require(not any(v and v.strip() and v.casefold() in profile_text for v in real_values), "非開示版の名義設定に本名側の値が混入しています")
    for key, item in resolved.items():
        try:
            body = source_path(root, item, site).read_text(encoding="utf-8-sig")
        except (OSError, UnicodeError) as exc:
            raise Invalid("素材をUTF-8で読めません") from exc
        searchable = (item["source"] + "\n" + item["output"] + "\n" + body).casefold()
        if config["audience"] == "general":
            require(not any(word.casefold() in searchable for word in GENERAL_EXCLUDED), "一般向け素材に専門情報の候補があります")
        if config["identity_mode"] == "alias":
            require(not any(v and v.strip() and v.casefold() in searchable for v in real_values), "非開示版に本名側の設定値が混入しています")
        # This deliberately small Markdown subset avoids uninspected HTML/reference URLs.
        require(not re.search(r"<|https?://|mailto:|(?m:^\s*\[[^\]]+\]:)|\]\[", body), "HTML・外部URL・参照形式リンクは個別の検査追加が必要")
        for target in LINK.findall(body):
            parsed = urlsplit(unquote(target))
            require(not parsed.scheme and not parsed.netloc and not parsed.query and not parsed.fragment, "許可外のリンク形式")
            require(parsed.path and not parsed.path.startswith("/") and "\\" not in parsed.path, "リンクは出力内の相対パスが必要")
            output = posixpath.normpath(posixpath.join(posixpath.dirname(item["output"]), parsed.path)).casefold()
            require(output in outputs, "公開先内にないリンク")
            require(outputs[output] == key or outputs[output] in item["dependencies"], "リンク先を依存素材へ登録してください")

    if ready:
        require(config["publication_enabled"], "公開は無効です")
        require(access != "undecided", "公開水準が未決定です")
        for field in ("public_name", "brand_name", "contact_email"):
            value = profile[field]
            require(isinstance(value, str) and value.strip() and not re.search(r"TODO|TBD|未設定|example\.", value, re.I), "公開用名義・連絡先が未設定です")
        require(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", profile["contact_email"]), "連絡先メールの形式が不正")
        require(all(item["review_status"] == "reviewed" for item in resolved.values()), "未レビューの素材があります")
    return len(resolved)


def main():
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", choices=[*CHANNELS, "all"], default="all")
    parser.add_argument("--ready", action="store_true", help="公開準備設定も検査（公開や認証確認は行わない）")
    args = parser.parse_args()
    failed = False
    for site in CHANNELS if args.site == "all" else [args.site]:
        try:
            count = check(ROOT, site, args.ready)
            print(f"OK {site}: {count} materials; configuration only")
        except Invalid as exc:
            failed = True
            print(f"NG {site}: {exc}", file=sys.stderr)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
