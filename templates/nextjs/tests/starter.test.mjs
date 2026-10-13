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

test('production page renders the project and interactive controls', () => {
  const html = read('.next/server/app/index.html');
  assert.ok(html.includes(pkg.name));
  assert.match(html, /Tasks completed:/);
  assert.match(html, /<button/);
  assert.match(html, /Complete a task/);
  assert.match(html, /Reset/);
  assert.match(read('app/page.tsx'), /useState/);
  assert.match(read('app/page.tsx'), /setCompleted/);
});
