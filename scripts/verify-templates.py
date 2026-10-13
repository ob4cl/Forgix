#!/usr/bin/env python3
"""Verify generated built-ins without publishing, hooks or listening servers.

Python 3.10+, Node 22.12+ and npm required; --install also needs uv.
Default: copy/substitute the bundled assets (not a CLI end-to-end claim).
--cli /absolute/path/to/bin/forgix.js: generate using the built CLI instead.
--install: npm ci --ignore-scripts, builds, tests, isolated Python install.
All generated projects/logs live under an explicit --work-dir (must not exist).
"""
import argparse
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SUPPORTED = ('express-ts', 'fastapi', 'nextjs', 'node-api', 'python-script',
             'react-vite', 'react-vite-ts', 'shadcn-next', 'svelte', 'vue-app')
ENTRY = {'express-ts': 'src/index.ts', 'fastapi': 'main.py',
         'nextjs': 'app/page.tsx', 'node-api': 'index.js',
         'python-script': 'main.py', 'react-vite': 'src/main.jsx',
         'react-vite-ts': 'src/main.tsx', 'shadcn-next': 'app/page.tsx',
         'svelte': 'src/main.js', 'vue-app': 'src/main.js'}
HOOKS = {'preinstall', 'install', 'postinstall', 'prepare', 'prepublish', 'prepublishOnly'}


def run(command, cwd, log, env):
    with log.open('a', encoding='utf-8') as out:
        out.write('\n$ ' + ' '.join(map(str, command)) + '\n')
        out.flush()
        result = subprocess.run(command, cwd=cwd, env=env, stdout=out,
                                stderr=subprocess.STDOUT, timeout=600)
    if result.returncode:
        raise AssertionError(f"Command failed ({result.returncode}): {' '.join(map(str, command))}; see {log}")


def verify(name, args, env):
    source = ROOT / 'templates' / name
    dest = args.work_dir / ('starter-' + name)
    log = args.work_dir / (name + '.log')
    if args.cli:
        run(['node', str(args.cli), 'create', dest.name, '--template', name,
             '--non-interactive', '--skip-install'], args.work_dir, log, env)
    else:
        shutil.copytree(source, dest, ignore=shutil.ignore_patterns('node_modules', 'dist', '.next', '.venv', '__pycache__'))
        values = {'projectName': dest.name, 'author': 'Developer', 'license': 'MIT'}
        for p in dest.rglob('*'):
            if p.is_file():
                text = p.read_text(encoding='utf-8')
                text = re.sub(r'\{\{(.*?)\}\}', lambda m: values.get(m[1].strip(), m[0]), text)
                p.write_text(text, encoding='utf-8')
    manual_ignore = False
    if not (dest / '.gitignore').exists() and args.manual_ignore_fallback:
        fallback = dest / '_gitignore'
        assert fallback.is_file(), f'{name}: missing pack-safe ignore fallback'
        assert fallback.read_bytes() == (source / '.gitignore').read_bytes(), f'{name}: ignore fallback drift'
        shutil.copyfile(fallback, dest / '.gitignore')
        manual_ignore = True
    for required in ['README.md', '.gitignore', ENTRY[name]]:
        assert (dest / required).is_file(), f'{name}: missing {required}'
    for p in dest.rglob('*'):
        if p.is_file() and p.name not in {'.scaffold-lock.yaml'}:
            assert '{{projectName}}' not in p.read_text(encoding='utf-8'), f'{name}: unresolved placeholder in {p.name}'
    pkg_path = dest / 'package.json'
    if pkg_path.exists():
        pkg = json.loads(pkg_path.read_text())
        assert pkg.get('private') is True, f'{name}: starter should be private'
        assert pkg.get('type') == 'module', f'{name}: explicit ESM expected'
        assert not HOOKS.intersection(pkg.get('scripts', {})), f'{name}: lifecycle hook'
        assert (dest / 'package-lock.json').exists(), f'{name}: missing npm lockfile'
        assert {'dev', 'build', 'test'} <= pkg['scripts'].keys(), f'{name}: missing useful commands'
        if args.install:
            run(['npm', 'ci', '--ignore-scripts', '--no-fund', '--no-audit'], dest, log, env)
            run(['npm', 'run', 'build'], dest, log, env)
            run(['npm', 'test'], dest, log, env)
            if name in {'react-vite', 'react-vite-ts', 'vue-app', 'svelte'}:
                html = (dest / 'dist/index.html').read_text()
                assert re.search(r'<script[^>]+src=', html), f'{name}: no bundled application entry'
                assert list((dest / 'dist/assets').glob('*.js')), f'{name}: missing JS bundle'
            if name in {'nextjs', 'shadcn-next'}:
                html = (dest / '.next/server/app/index.html').read_text()
                assert dest.name in html, f'{name}: rendered page missing project title'
                if name == 'shadcn-next':
                    assert '<button' in html, 'shadcn-next: button not rendered'
    elif name == 'fastapi':
        requirements = (dest / 'requirements.txt').read_text().splitlines()
        assert requirements and all(re.fullmatch(r'[A-Za-z0-9_.-]+==[^\s]+', s) for s in requirements if s and not s.startswith('#')), 'fastapi: invalid requirements syntax'
        if args.install:
            run(['uv', 'venv', '--python', '3.12', '.venv'], dest, log, env)
            python = dest / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
            run(['uv', 'pip', 'install', '--python', str(python), '--only-binary', ':all:', '-r', 'requirements.txt', '-r', 'requirements-dev.txt'], dest, log, env)
            run([str(python), '-m', 'unittest', 'discover', '-s', 'tests', '-v'], dest, log, env)
            run([str(python), '-m', 'compileall', '-q', 'main.py'], dest, log, env)
    elif args.install:
        run([sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-v'], dest, log, env)
        run([sys.executable, 'main.py', '--name', 'Starter'], dest, log, env)
    return {'template': name, 'status': 'passed', 'mode': 'install-build-test' if args.install else 'structure-only',
            'manual_setup': ['copy _gitignore to .gitignore'] if manual_ignore else []}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--work-dir', type=Path, required=True)
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--cli', type=Path)
    parser.add_argument('--manual-ignore-fallback', action='store_true',
                        help='Explicitly perform documented _gitignore copy if packaging omitted .gitignore; reported as manual setup, never an engine pass')
    parser.add_argument('--templates', nargs='+', choices=SUPPORTED, default=list(SUPPORTED))
    args = parser.parse_args()
    args.work_dir = args.work_dir.resolve()
    if args.cli:
        args.cli = args.cli.resolve()
    args.work_dir.mkdir(parents=True, exist_ok=False)
    env = os.environ.copy()
    env.update({'HOME': str(args.work_dir / 'home'), 'NEXT_TELEMETRY_DISABLED': '1', 'CI': '1', 'npm_config_ignore_scripts': 'true'})
    Path(env['HOME']).mkdir()
    actual = {p.name for p in (ROOT / 'templates').iterdir() if p.is_dir()}
    assert actual == set(SUPPORTED), f'Unreviewed template inventory: {actual ^ set(SUPPORTED)}'
    results = []
    for name in args.templates:
        try:
            results.append(verify(name, args, env))
            print(f'PASS {name}', flush=True)
        except (AssertionError, OSError, subprocess.TimeoutExpired, ValueError) as exc:
            results.append({'template': name, 'status': 'failed', 'error': str(exc)})
            print(f'FAIL {name}: {exc}', flush=True)
    (args.work_dir / 'results.json').write_text(json.dumps(results, indent=2) + '\n')
    return int(any(r['status'] != 'passed' for r in results))


if __name__ == '__main__':
    sys.exit(main())
