#!/usr/bin/env python3
"""Exercise file-only plugins in an isolated generated Node API.
No publication, hooks, listeners or automatic framework integration.
Docker image build/runtime tests are deliberately separate.
"""
import argparse
import json
import os
from pathlib import Path
import subprocess
import importlib.util

spec = importlib.util.spec_from_file_location('verify_templates', Path(__file__).with_name('verify-templates.py'))
verify = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verify)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--cli', type=Path, required=True)
    args = parser.parse_args()
    args.work_dir = args.work_dir.resolve()
    args.cli = args.cli.resolve()
    args.work_dir.mkdir(parents=True, exist_ok=False)
    env = os.environ.copy()
    env.update({'HOME': str(args.work_dir / 'home'), 'CI': '1', 'npm_config_ignore_scripts': 'true'})
    Path(env['HOME']).mkdir()
    log = args.work_dir / 'plugins.log'
    run = lambda command, cwd: verify.run(command, cwd, log, env)
    run(['node', str(args.cli), 'create', 'plugin-starter', '--template', 'node-api', '--non-interactive', '--skip-install'], args.work_dir)
    starter = args.work_dir / 'plugin-starter'
    original = (starter / 'README.md').read_bytes()
    for plugin in ['docker', 'eslint', 'jest', 'prettier', 'tailwind']:
        run(['node', str(args.cli), 'add', plugin], starter)
        assert (starter / 'README.md').read_bytes() == original, f'{plugin} changed the project README'
    # The repaired CLI must reject collisions without changing any files.
    before = {str(p.relative_to(starter)): p.read_bytes() for p in starter.rglob('*') if p.is_file()}
    result = subprocess.run(['node', str(args.cli), 'add', 'prettier'], cwd=starter, env=env, capture_output=True, text=True, timeout=60)
    assert result.returncode != 0 and 'exist' in (result.stdout + result.stderr).lower(), 'plugin collision did not fail explicitly'
    after = {str(p.relative_to(starter)): p.read_bytes() for p in starter.rglob('*') if p.is_file()}
    assert before == after, 'collision changed existing project files'
    # Explicit manual dependency install, not something the plugin engine did.
    run(['npm', 'install', '--save-dev', '--save-exact', '--ignore-scripts', '--no-audit', '--no-fund',
         'eslint@10.12.0', '@eslint/js@10.0.1', 'globals@17.13.0', 'jest@30.5.2',
         'prettier@3.9.10', 'tailwindcss@4.3.3', '@tailwindcss/cli@4.3.3'], starter)
    run(['npm', 'run', 'build'], starter)
    run(['npm', 'test'], starter)
    run(['npx', '--no-install', 'eslint', '--config', 'eslint.forgix.config.mjs', 'app.js', 'index.js'], starter)
    bad = starter / 'lint-regression.js'
    bad.write_text('undeclaredValue = 42;\n')
    result = subprocess.run(['npx', '--no-install', 'eslint', '--config', 'eslint.forgix.config.mjs', bad.name], cwd=starter, env=env, capture_output=True, text=True, timeout=60)
    assert result.returncode == 1 and 'no-undef' in result.stdout, 'ESLint did not detect an undeclared variable'
    bad.unlink()
    run(['npx', '--no-install', 'jest', '--config', 'jest.forgix.config.cjs', '--runInBand', '--coverage'], starter)
    run(['npx', '--no-install', 'prettier', '--write', 'app.js'], starter)
    run(['npx', '--no-install', 'prettier', '--check', 'app.js'], starter)
    run(['npx', '--no-install', '@tailwindcss/cli', '-i', 'tooling/tailwind/input.css', '-o', 'public/tailwind.css', '--minify'], starter)
    css = (starter / 'public/tailwind.css').read_text()
    assert '.font-bold' in css and '.bg-slate-950' in css, 'Tailwind demo utilities missing'
    run(['npm', 'test'], starter)
    report = {'passed': ['CLI plugin copies', 'README preservation', 'collision rejection with unchanged files',
                         'node-api HTTP smoke', 'ESLint valid source + violation detection',
                         'Jest example tests and coverage', 'Prettier write/check', 'Tailwind CSS compilation'],
              'not_checked': ['Docker image build/runtime (separate)', 'automatic framework integration (not provided)']}
    (args.work_dir / 'results.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
