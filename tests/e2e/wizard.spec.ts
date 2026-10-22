import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const wizard = (page: Page) => page.getByRole('region', { name: 'Deployment configurator' });
async function checkAccessibility(page: Page) {
  const result = await new AxeBuilder({ page }).analyze();
  expect(result.violations.map(violation => ({ id: violation.id,
    nodes: violation.nodes.map(node => ({ target: node.target, message: node.failureSummary })) }))).toEqual([]);
}
async function next(page: Page) { await wizard(page).getByRole('button', { name: 'Continue', exact: true }).click(); }
async function identity(page: Page) {
  await page.getByLabel('Project slug', { exact: true }).fill('my-app');
  await page.getByLabel('Domain', { exact: true }).fill('app.example.com');
  await page.getByLabel('Certificate contact email').fill('operator@example.com');
}
async function result(page: Page) {
  await next(page); await next(page);
  await page.getByRole('button', { name: 'Review configuration' }).click();
  await expect(page.getByRole('heading', { name: 'Ready when you are.' })).toBeVisible();
}
test.beforeEach(async ({ page }) => { await page.goto('/'); });
test('minimal PostgreSQL, copied command, export, reload and accessibility', async ({ page, context }, info) => {
  const externalRequests: string[] = [];
  page.on('request', request => { if (!request.url().startsWith('http://127.0.0.1:4173')) externalRequests.push(request.url()); });
  await expect(page).toHaveTitle(/LaraShip/);
  await page.getByRole('link', { name: 'Configure your deployment', exact: true }).click();
  await next(page); await identity(page); await next(page); await result(page);
  const command = wizard(page).locator('.code-block').filter({ hasText: 'bash · deploy' });
  await expect(command).toContainText("--db-type 'postgres'");
  await expect(command).not.toContainText('--db-native');
  await expect(command).not.toContainText('--with');
  if (info.project.name === 'desktop') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy command', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain("--slug 'my-app'");
  }
  await page.getByText('Prefer a configuration file?', { exact: true }).click();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download configuration' }).click();
  expect((await downloadPromise).suggestedFilename()).toBe('deploy.config');
  expect(await page.evaluate(() => ({ storage: { ...localStorage }, url: location.href }))).toEqual({ storage: {}, url: 'http://127.0.0.1:4173/#configure' });
  expect(externalRequests).toEqual([]);
  await checkAccessibility(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `test-results/${info.project.name}-result.png`, fullPage: true });
  await page.reload(); await expect(page.getByRole('heading', { name: 'What are we shipping?' })).toBeVisible();
});
test('native MySQL is explicitly a manual template', async ({ page }) => {
  await next(page); await identity(page); await next(page);
  await page.getByRole('radio', { name: 'MySQL', exact: false }).check();
  await page.getByRole('radio', { name: 'Native on this server' }).check();
  await expect(wizard(page)).toContainText('MANUAL STEP REQUIRED');
  await result(page);
  await expect(wizard(page)).toContainText('Template — server-side secret required');
  await expect(page.getByRole('button', { name: 'Copy deployment template' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copy command', exact: true })).toHaveCount(0);
  await expect(wizard(page).locator('input[type=password]')).toHaveCount(0);
  await expect(wizard(page)).toContainText("--db-root-password '<MYSQL_ROOT_PASSWORD>'");
});
test('presets lock additive modules and source change removes incompatible modules', async ({ page }) => {
  await page.getByRole('radio', { name: 'admin-panel' }).check();
  await next(page); await identity(page); await next(page); await next(page);
  await expect(page.getByRole('checkbox', { name: 'Filament admin' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Queue worker' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /^Horizon/ })).toBeDisabled();
  await page.getByLabel('Filament administrator email').fill('admin@example.com');
  await wizard(page).getByRole('button', { name: 'Application', exact: false }).click();
  await page.getByRole('radio', { name: 'Existing repository' }).check();
  await expect(page.getByRole('radio', { name: 'No preset' })).toBeChecked();
  await page.getByLabel('Repository URL', { exact: true }).fill('https://token@github.com/acme/app');
  await next(page); await expect(page.getByRole('alert')).toContainText('without embedded credentials');
  await page.getByLabel('Repository URL', { exact: true }).fill('https://github.com/acme/app.git');
  await next(page); await next(page); await result(page);
  const command = wizard(page).locator('.code-block').filter({ hasText: 'bash · deploy' });
  await expect(command).toContainText('--repo'); await expect(command).not.toContainText('--laravel-version');
  await expect(command).not.toContainText('filament');
});
test('Horizon dependency, Advanced ports and consent checks', async ({ page }) => {
  await page.getByRole('button', { name: 'Advanced', exact: true }).click();
  await next(page); await identity(page); await next(page); await next(page);
  await page.getByRole('checkbox', { name: /^Horizon/ }).check();
  await expect(page.getByRole('checkbox', { name: 'Redis integration' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Queue worker' })).toBeDisabled();
  await next(page);
  await page.getByText('Networking & ports', { exact: true }).click();
  await page.getByLabel('HTTP', { exact: true }).fill('8150');
  await page.getByLabel('PHP', { exact: true }).fill('8150');
  await page.getByRole('button', { name: 'Review configuration' }).click();
  await expect(page.getByRole('alert')).toContainText('Explicit ports must be different');
  await page.getByLabel('PHP', { exact: true }).fill('9150');
  await page.getByText('Integrations', { exact: true }).click();
  await page.getByLabel('Notification endpoint').fill('https://notify.example/deploy');
  await page.getByRole('button', { name: 'Review configuration' }).click();
  await expect(page.getByRole('alert')).toContainText('Acknowledge');
  await page.getByRole('checkbox', { name: 'I trust this endpoint' }).check();
  await page.getByRole('button', { name: 'Review configuration' }).click();
  await expect(wizard(page)).toContainText("--with 'redis,horizon'");
});
test('opt-in saves only preferences and Clear data resets everything', async ({ page }) => {
  await page.getByRole('radio', { name: 'api', exact: false }).check();
  await page.getByRole('checkbox', { name: 'Remember non-sensitive preferences' }).check();
  await next(page); await identity(page);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/operator|example|my-app/);
  await page.reload(); await expect(page.getByRole('radio', { name: 'api', exact: false })).toBeChecked();
  await page.getByRole('button', { name: 'Clear data' }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(page.getByRole('radio', { name: 'No preset' })).toBeChecked();
});
test('keyboard navigation, Russian toggle and responsive landing', async ({ page }, info) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to configurator' })).toBeFocused();
  await checkAccessibility(page);
  await page.screenshot({ path: `test-results/${info.project.name}-landing.png`, fullPage: true });
  await page.getByRole('button', { name: 'Switch to Russian' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('heading', { name: 'Что разворачиваем?' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Новое приложение Laravel' })).toBeChecked();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Введите DNS-имя');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
