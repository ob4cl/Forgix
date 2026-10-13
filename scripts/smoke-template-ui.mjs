#!/usr/bin/env node
// Optional production-asset smoke check. No HTTP/dev server is started.
// Requires an existing Playwright module and installed Chromium; see scripts/README.md.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).reduce((items, value, index, all) => {
  if (value.startsWith('--')) items.push([value.slice(2), all[index + 1]]);
  return items;
}, []));
for (const key of ['projects', 'output', 'playwright', 'chromium']) assert.ok(args[key], `Missing --${key}`);
const { chromium } = await import(pathToFileURL(path.resolve(args.playwright)).href);
const output = path.resolve(args.output);
await mkdir(output, { recursive: true });
const templates = ['react-vite', 'react-vite-ts', 'vue-app', 'svelte', 'nextjs', 'shadcn-next'];
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const results = [];
const browser = await chromium.launch({ executablePath: path.resolve(args.chromium), headless: true });
try {
  for (const template of templates) {
    const project = path.resolve(args.projects, `starter-${template}`);
    const next = ['nextjs', 'shadcn-next'].includes(template);
    const build = path.join(project, next ? '.next' : 'dist');
    for (const width of [1440, 390, 320]) {
      for (const reducedMotion of ['reduce', 'no-preference']) {
        const errors = [];
        const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion });
        await context.route('**/*', async (route) => {
          const url = new URL(route.request().url());
          try {
            assert.equal(url.origin, 'https://starter.test', `Unexpected external request: ${url}`);
            let relative = decodeURIComponent(url.pathname).replace(/^\//, '');
            if (!relative) relative = next ? 'server/app/index.html' : 'index.html';
            else if (next && relative.startsWith('_next/')) relative = relative.slice('_next/'.length);
            const file = path.resolve(build, relative);
            assert.ok(file.startsWith(build + path.sep), 'Asset escaped build directory');
            await route.fulfill({ status: 200, contentType: mime[path.extname(file)] || 'application/octet-stream', body: await readFile(file) });
          } catch (error) {
            errors.push(String(error));
            await route.fulfill({ status: 404, body: 'Missing production asset' });
          }
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        page.on('requestfailed', request => errors.push(request.url()));
        try {
          await page.goto('https://starter.test/', { waitUntil: 'networkidle' });
          const status = page.getByRole('status');
          await status.waitFor();
          assert.equal(await status.innerText(), 'Tasks completed: 0');
          await page.getByRole('button', { name: 'Complete a task', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.trim() === 'Tasks completed: 1');
          await page.getByRole('button', { name: 'Complete a task', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.trim() === 'Tasks completed: 2');
          await page.getByRole('button', { name: 'Reset', exact: true }).click();
          await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.trim() === 'Tasks completed: 0');
          // Real keyboard activation, not a synthetic handler call.
          await page.getByRole('button', { name: 'Complete a task', exact: true }).focus();
          await page.keyboard.press('Enter');
          await page.waitForFunction(() => document.querySelector('[role="status"]').textContent.trim() === 'Tasks completed: 1');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Horizontal overflow');
          assert.deepEqual(errors, [], 'Request/runtime errors');
          const screenshot = path.join(output, `${template}-${width}-${reducedMotion}.png`);
          await page.screenshot({ path: screenshot, fullPage: true });
          results.push({ template, width, reducedMotion, status: 'passed', groups: ['initial state', 'increment twice', 'reset', 'keyboard Enter', 'no overflow', 'no external/missing requests or runtime errors'], screenshot });
        } catch (error) {
          results.push({ template, width, reducedMotion, status: 'failed', error: String(error), errors });
        } finally {
          await context.close();
        }
      }
    }
  }
} finally {
  await browser.close();
}
await writeFile(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
const failed = results.filter(result => result.status === 'failed');
console.log(JSON.stringify({ cases: results.length, passed: results.length - failed.length, failed }, null, 2));
process.exitCode = failed.length ? 1 : 0;
