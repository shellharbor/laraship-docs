import { chromium } from '@playwright/test';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import assert from 'node:assert/strict';

// Test the actual production output under a project Pages path without replacing dist/.
process.env.SITE_URL = 'https://example.test/fixture-repo';
const { build, preview } = await import('vite');
const base = '/fixture-repo/';
const outDir = 'tmp/pages-build';
await build({ base, build: { outDir, emptyOutDir: true } });
assert(existsSync(`${outDir}/.nojekyll`));
const html = readFileSync(`${outDir}/index.html`, 'utf8');
assert(html.includes('href="https://example.test/fixture-repo/"'));
assert(html.includes('/fixture-repo/assets/'));
assert(readFileSync(`${outDir}/robots.txt`, 'utf8').includes('https://example.test/fixture-repo/sitemap.xml'));
const server = await preview({ base, build: { outDir }, preview: { host: '127.0.0.1', port: 4183, strictPort: true } });
let browser;
try {
  browser = await chromium.launch();
  mkdirSync('test-results', { recursive: true });
  for (const [name, viewport] of [['desktop', { width: 1440, height: 1000 }], ['mobile', { width: 390, height: 844 }]]) {
    const page = await browser.newPage({ viewport });
    const failures = [];
    page.on('pageerror', error => failures.push(error.message));
    page.on('response', response => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`); });
    await page.goto(`http://127.0.0.1:4183${base}#configure`);
    await page.getByRole('heading', { name: 'What are we shipping?' }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'What are we shipping?' }).waitFor();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.goto(`http://127.0.0.1:4183${base}`);
    await page.screenshot({ path: `test-results/${name}-preview.png`, fullPage: true });
    assert.deepEqual(failures, []);
    await page.close();
  }
  console.log('Pages production smoke passed: project path, assets, refresh, desktop/mobile layout, canonical, robots, .nojekyll.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.httpServer.close(resolve));
}
