"""File-only plugin contracts; no root dependency installation required."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[2] / 'plugins'


class PluginAssetTests(unittest.TestCase):
    def test_inventory_is_reviewed(self):
        self.assertEqual({p.name for p in ROOT.iterdir() if p.is_dir()},
                         {'docker', 'eslint', 'jest', 'prettier', 'tailwind'})

    def test_plugins_do_not_overwrite_starter_readme_or_manifest(self):
        for plugin in ROOT.iterdir():
            if plugin.is_dir():
                with self.subTest(plugin=plugin.name):
                    self.assertFalse((plugin / 'README.md').exists())
                    self.assertFalse((plugin / 'package.json').exists())
                    self.assertTrue(list(plugin.glob('FORGIX-*.md')))

    def test_eslint_has_explicit_flat_config(self):
        config = (ROOT / 'eslint/eslint.forgix.config.mjs').read_text()
        self.assertIn('@eslint/js', config)
        self.assertIn('globals', config)

    def test_jest_does_not_treat_native_node_tests_as_jest_tests(self):
        config = (ROOT / 'jest/jest.forgix.config.cjs').read_text()
        self.assertIn('tooling/jest/**/*.test.cjs', config)
        self.assertTrue((ROOT / 'jest/tooling/jest/slugify.test.cjs').is_file())

    def test_prettier_ignores_generated_files(self):
        ignore = (ROOT / 'prettier/.prettierignore').read_text()
        for directory in ['node_modules/', 'dist/', '.next/']:
            self.assertIn(directory, ignore)

    def test_tailwind_provides_css_not_automatic_framework_integration(self):
        self.assertIn('@import "tailwindcss"',
                      (ROOT / 'tailwind/tooling/tailwind/input.css').read_text())

    def test_docker_uses_lockfile_build_and_non_root_runtime(self):
        dockerfile = (ROOT / 'docker/Dockerfile').read_text()
        for text in ['node:22-alpine', 'npm ci --ignore-scripts', 'npm run build',
                     'USER node', 'HOST=0.0.0.0']:
            self.assertIn(text, dockerfile)
        ignore = (ROOT / 'docker/.dockerignore').read_text()
        for text in ['node_modules', '.git', '.env']:
            self.assertIn(text, ignore)


if __name__ == '__main__':
    unittest.main()
