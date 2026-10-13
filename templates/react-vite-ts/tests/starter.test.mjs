import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));

test('private starter uses pinned dependencies without install hooks', () => {
  assert.equal(pkg.private, true);
  for (const version of Object.values({ ...pkg.dependencies, ...pkg.devDependencies })) {
    assert.match(version, /^\d+\.\d+\.\d+$/);
  }
  for (const hook of ['preinstall', 'install', 'postinstall', 'prepare']) {
    assert.equal(pkg.scripts[hook], undefined);
  }
});

test('production HTML loads compiled JS and CSS with project title', () => {
  const html = read('dist/index.html');
  assert.ok(html.includes(pkg.name));
  assert.match(html, /<script[^>]+src="[^" ]+\.js"/);
  assert.match(html, /<link[^>]+href="[^" ]+\.css"/);
  const assets = readdirSync(new URL('../dist/assets/', import.meta.url));
  assert.ok(assets.some((name) => name.endsWith('.js')));
  const bundle = assets.filter((name) => name.endsWith('.js')).map((name) => read('dist/assets/' + name)).join('');
  assert.match(bundle, /Complete a task/);
  assert.match(bundle, /Reset/);
  assert.match(read('src/App.tsx'), /completed/);
});
