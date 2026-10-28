"""Regression tests for WIP publication boundaries."""
import json
from pathlib import Path
import shutil
import tempfile
import unittest

from build_wip import ROOT, SITES, PUBLIC_FILES, build

class WipTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for site in SITES:
            (self.root / site / "content").mkdir(parents=True)
            for rel in ("wip.yaml", "content/wip.json"):
                shutil.copyfile(ROOT / site / rel, self.root / site / rel)

    def tearDown(self):
        self.temp.cleanup()

    def edit(self, site, **fields):
        path = self.root / site / "content/wip.json"
        data = json.loads(path.read_text(encoding="utf-8"))
        data.update(fields)
        path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    def test_allowlist_and_no_private_inputs(self):
        for site in SITES:
            output = build(site, self.root)
            self.assertEqual({p.name for p in output.iterdir()}, PUBLIC_FILES)
            home = (output / "index.html").read_text(encoding="utf-8")
            self.assertNotIn("mailto:", home)
            self.assertIn("noindex,nofollow", home)
            self.assertNotIn("wip.yaml", home)

    def test_general_rejects_specialist_text(self):
        self.edit("alias-general", intro="キャスト評価を案内")
        with self.assertRaises(ValueError): build("alias-general", self.root)

    def test_rejects_cross_identity(self):
        self.edit("alias-general", intro="月灯ラボも運営しています")
        with self.assertRaises(ValueError): build("alias-general", self.root)

    def test_rejects_external_link_and_markup(self):
        for text in ("https://example.com", "<script>alert(1)</script>", "name@example.com"):
            self.edit("alias-general", intro=text)
            with self.assertRaises(ValueError): build("alias-general", self.root)

    def test_rejects_accidental_files(self):
        output = build("alias-general", self.root)
        (output / "private.txt").write_text("private")
        with self.assertRaises(ValueError): build("alias-general", self.root)

    def test_requires_preparation_notice(self):
        self.edit("alias-general", notice="受付を開始しました")
        with self.assertRaises(ValueError): build("alias-general", self.root)

    def test_known_realname_is_rejected(self):
        target = self.root / "realname-general"
        target.mkdir()
        (target / "publish.yaml").write_text('identity_profile:\n  public_name: Example Person\n', encoding="utf-8")
        self.edit("alias-general", intro="Example Person")
        with self.assertRaises(ValueError): build("alias-general", self.root)

if __name__ == "__main__":
    unittest.main()
