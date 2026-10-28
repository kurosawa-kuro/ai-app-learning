"""Regression checks for publication boundaries; uses disposable fixtures only."""

import shutil
import tempfile
import unittest
from pathlib import Path

import yaml

from check_publication import CHANNELS, ROOT, Invalid, check


class PublicationTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="publication-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        for name in ("common", *CHANNELS):
            shutil.copytree(ROOT / name, self.root / name)
        shutil.copy2(ROOT / "catalog.yaml", self.root / "catalog.yaml")

    def change(self, path, action):
        target = self.root / path
        value = yaml.safe_load(target.read_text(encoding="utf-8"))
        action(value)
        target.write_text(yaml.safe_dump(value, allow_unicode=True), encoding="utf-8")

    def test_each_channel(self):
        self.assertEqual([check(self.root, site) for site in CHANNELS], [4, 5, 4])

    def test_all_channels_blocked_for_publication(self):
        for site in CHANNELS:
            with self.subTest(site=site), self.assertRaises(Invalid):
                check(self.root, site, ready=True)

    def test_general_cannot_select_evaluation(self):
        self.change("alias-general/publish.yaml", lambda c: c["selected_ids"].append("an-evaluation"))
        with self.assertRaisesRegex(Invalid, "許可されていない"):
            check(self.root, "alias-general")

    def test_dependency_cannot_cross_boundary(self):
        self.change("catalog.yaml", lambda c: c["materials"][0]["dependencies"].append("an-evaluation"))
        with self.assertRaises(Invalid):
            check(self.root, "realname-general")

    def test_source_cannot_escape(self):
        self.change("catalog.yaml", lambda c: c["materials"][0].update(source="../docs/README.md"))
        with self.assertRaises(Invalid):
            check(self.root, "alias-general")

    def test_widening_allowlist_does_not_allow_other_folder(self):
        self.change("catalog.yaml", lambda c: c["materials"][-1].update(source="alias-nightlife/content/photo-diary.md"))
        with self.assertRaisesRegex(Invalid, "別出口"):
            check(self.root, "alias-general")

    def test_nightlife_in_shared_content_is_rejected_for_general(self):
        target = self.root / "common/content/first-step.md"
        target.write_text("# 写メ日記\n", encoding="utf-8")
        with self.assertRaisesRegex(Invalid, "専門情報"):
            check(self.root, "alias-general")

    def test_link_cannot_escape(self):
        target = self.root / "alias-general/content/index.md"
        target.write_text("[内部資料](../../docs/README.md)\n", encoding="utf-8")
        with self.assertRaisesRegex(Invalid, "公開先内にない"):
            check(self.root, "alias-general")

    def test_identity_axes_are_fixed(self):
        self.change("alias-general/publish.yaml", lambda c: c.update(identity_mode="realname"))
        with self.assertRaisesRegex(Invalid, "組合せ"):
            check(self.root, "alias-general")

    def test_duplicate_yaml_key_is_rejected(self):
        target = self.root / "alias-general/publish.yaml"
        with target.open("a", encoding="utf-8") as stream:
            stream.write("publication_enabled: true\n")
        with self.assertRaises(Invalid):
            check(self.root, "alias-general")

    def test_alias_rejects_configured_real_name_without_echoing(self):
        marker = "PRIVATE_FIXTURE_NAME"
        self.change("realname-general/publish.yaml", lambda c: c["identity_profile"].update(public_name=marker))
        (self.root / "alias-general/content/index.md").write_text(marker, encoding="utf-8")
        with self.assertRaises(Invalid) as raised:
            check(self.root, "alias-general")
        self.assertNotIn(marker, str(raised.exception))

    def test_readiness_is_independent_of_other_channels(self):
        def ready(c):
            c.update(publication_enabled=True)
            c["identity_profile"].update(public_name="仮名テスト", brand_name="試験用", contact_email="test@invalid.test")
        self.change("alias-general/publish.yaml", ready)
        self.change("catalog.yaml", lambda c: [m.update(review_status="reviewed") for m in c["materials"]])
        self.assertEqual(check(self.root, "alias-general", ready=True), 4)
        with self.assertRaises(Invalid):
            check(self.root, "realname-general", ready=True)

    def test_enabled_without_profile_is_not_ready(self):
        self.change("alias-general/publish.yaml", lambda c: c.update(publication_enabled=True))
        with self.assertRaisesRegex(Invalid, "未設定"):
            check(self.root, "alias-general", ready=True)

    def test_undecided_access_is_not_ready(self):
        self.change("alias-nightlife/publish.yaml", lambda c: c.update(publication_enabled=True))
        with self.assertRaisesRegex(Invalid, "公開水準"):
            check(self.root, "alias-nightlife", ready=True)

    def test_duplicate_output_is_rejected(self):
        self.change("catalog.yaml", lambda c: c["materials"][0].update(output="index.md"))
        with self.assertRaisesRegex(Invalid, "出力先が重複"):
            check(self.root, "alias-general")

    def test_unknown_material_is_rejected(self):
        self.change("alias-general/publish.yaml", lambda c: c["selected_ids"].append("unknown-material"))
        with self.assertRaisesRegex(Invalid, "未知の素材"):
            check(self.root, "alias-general")

    def test_alias_profile_cannot_use_real_name_setting(self):
        self.change("realname-general/publish.yaml", lambda c: c["identity_profile"].update(public_name="PRIVATE_FIXTURE_NAME"))
        self.change("alias-general/publish.yaml", lambda c: c["identity_profile"].update(public_name="PRIVATE_FIXTURE_NAME"))
        with self.assertRaisesRegex(Invalid, "名義設定"):
            check(self.root, "alias-general")

    def test_drafts_are_not_ready(self):
        def ready(c):
            c.update(publication_enabled=True)
            c["identity_profile"].update(public_name="試験名", brand_name="試験用", contact_email="test@invalid.test")
        self.change("alias-general/publish.yaml", ready)
        with self.assertRaisesRegex(Invalid, "未レビュー"):
            check(self.root, "alias-general", ready=True)

    def test_aliases_cannot_share_public_name(self):
        for site in ("alias-nightlife", "alias-general"):
            self.change(f"{site}/publish.yaml", lambda c: c["identity_profile"].update(public_name="PRIVATE_ALIAS_FIXTURE"))
        for site in ("alias-nightlife", "alias-general"):
            with self.subTest(site=site), self.assertRaises(Invalid) as raised:
                check(self.root, site)
            self.assertNotIn("PRIVATE_ALIAS_FIXTURE", str(raised.exception))

    def test_alias_name_normalization(self):
        self.change("alias-nightlife/publish.yaml", lambda c: c["identity_profile"].update(public_name="Ａｌｉａｓ X"))
        self.change("alias-general/publish.yaml", lambda c: c["identity_profile"].update(public_name="aliasx"))
        with self.assertRaisesRegex(Invalid, "別の活動名"):
            check(self.root, "alias-general")

    def test_aliases_cannot_share_contact(self):
        for site in ("alias-nightlife", "alias-general"):
            self.change(f"{site}/publish.yaml", lambda c: c["identity_profile"].update(contact_email="same@invalid.test"))
        with self.assertRaisesRegex(Invalid, "連絡先"):
            check(self.root, "alias-nightlife")

    def test_distinct_aliases_are_valid(self):
        self.change("alias-nightlife/publish.yaml", lambda c: c["identity_profile"].update(public_name="専門用テスト", contact_email="night@invalid.test"))
        self.change("alias-general/publish.yaml", lambda c: c["identity_profile"].update(public_name="一般用テスト", contact_email="general@invalid.test"))
        self.assertEqual(check(self.root, "alias-nightlife"), 5)
        self.assertEqual(check(self.root, "alias-general"), 4)


if __name__ == "__main__":
    unittest.main()
