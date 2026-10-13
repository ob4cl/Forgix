"""Inventory and packaging-friendly source asset regression checks."""
import json
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[2] / 'templates'
SUPPORTED = {'express-ts', 'fastapi', 'nextjs', 'node-api', 'python-script',
             'react-vite', 'react-vite-ts', 'shadcn-next', 'svelte', 'vue-app'}


class TemplateAssetTests(unittest.TestCase):
    def test_inventory(self):
        self.assertEqual({p.name for p in ROOT.iterdir() if p.is_dir()}, SUPPORTED)

    def test_pack_safe_ignore_asset_cannot_drift(self):
        for name in SUPPORTED:
            with self.subTest(template=name):
                self.assertEqual((ROOT / name / '_gitignore').read_bytes(),
                                 (ROOT / name / '.gitignore').read_bytes())

    def test_assets_have_no_links_hooks_or_generated_output(self):
        for name in SUPPORTED:
            for path in (ROOT / name).rglob('*'):
                with self.subTest(asset=str(path.relative_to(ROOT))):
                    self.assertFalse(path.is_symlink())
                    self.assertNotIn(path.name, {'node_modules', 'dist', '.next', '.venv', '__pycache__', 'hooks.yaml'})

    def test_node_manifests_and_lock_names_are_renderable_and_consistent(self):
        for name in SUPPORTED:
            directory = ROOT / name
            if not (directory / 'package.json').exists():
                continue
            with self.subTest(template=name):
                package = json.loads((directory / 'package.json').read_text())
                lock = json.loads((directory / 'package-lock.json').read_text())
                self.assertEqual(package['name'], '{{projectName}}')
                self.assertEqual(lock['name'], package['name'])
                self.assertEqual(lock['packages']['']['name'], package['name'])
                self.assertEqual(package['type'], 'module')
                self.assertIs(package['private'], True)
                self.assertTrue({'dev', 'build', 'test'} <= package['scripts'].keys())
                for version in {**package.get('dependencies', {}), **package.get('devDependencies', {})}.values():
                    self.assertRegex(version, r'^\d+\.\d+\.\d+$')
                for field in ['dependencies', 'devDependencies']:
                    self.assertEqual(package.get(field, {}), lock['packages'][''].get(field, {}))

    def test_fastapi_requirements_are_pip_pins_not_yaml(self):
        for filename in ['requirements.txt', 'requirements-dev.txt']:
            requirements = (ROOT / 'fastapi' / filename).read_text().splitlines()
            self.assertTrue(requirements)
            for requirement in requirements:
                self.assertIsNotNone(re.fullmatch(r'[A-Za-z0-9_.-]+==[^\s]+', requirement))


if __name__ == '__main__':
    unittest.main()
