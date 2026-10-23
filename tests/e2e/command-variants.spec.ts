import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe.configure({ timeout: 90000 });
const wizard = (page: Page) => page.locator('#configure');
const next = (page: Page) => wizard(page).getByRole('button', { name: 'Continue', exact: true }).click();
const card = (page: Page, runner: string) => wizard(page).locator(`.deployment-variant[data-runner="${runner}"]`);
async function database(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveTitle(/LaraShip/);
  await next(page);
  await wizard(page).getByLabel('Project slug', { exact: true }).fill('all-formats');
  await wizard(page).getByLabel('Domain', { exact: true }).fill('app.example.com');
  await wizard(page).getByLabel('Certificate contact email').fill('operator@example.com');
  await next(page);
}
async function review(page: Page) {
  await next(page); await next(page);
  await wizard(page).getByRole('button', { name: 'Review configuration', exact: true }).click();
}

test('Bash, Docker and both Python commands are visible together and copy their own entrypoint', async ({ page, context }, info) => {
  await database(page);
  await wizard(page).getByLabel('Database user (optional)', { exact: true }).fill('all_formats_user');
  await wizard(page).getByLabel('Database port (optional)', { exact: true }).fill('5544');
  await review(page);
  await expect(wizard(page).locator('.deployment-variant')).toHaveCount(4);
  for (const runner of ['bash', 'docker', 'python-native', 'python-docker']) {
    await expect(card(page, runner).locator('pre')).toBeVisible();
    await expect(card(page, runner).locator('pre')).toContainText("--db-postgres-user 'all_formats_user'");
    await expect(card(page, runner).locator('pre')).toContainText("--port-postgres '5544'");
  }
  await expect(card(page, 'bash').locator('pre')).toContainText('sudo bash /opt/laraship/deploy-laravel.sh');
  await expect(card(page, 'docker').locator('pre')).toContainText('sudo docker run --rm -it --network host');
  await expect(card(page, 'python-native').locator('pre')).toContainText('deploy --backend native');
  await expect(card(page, 'python-docker').locator('pre')).toContainText('deploy --backend docker');
  if (info.project.name === 'desktop') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    for (const runner of ['bash', 'docker', 'python-native', 'python-docker']) {
      await card(page, runner).getByRole('button').click();
      expect((await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')).toBe(await card(page, runner).locator('pre').innerText());
    }
  }
  await wizard(page).getByRole('radio', { name: 'Docker image', exact: true }).first().check();
  await expect(card(page, 'docker')).toHaveAttribute('data-selected', 'true');
  await expect(wizard(page).locator('.deployment-variant pre')).toHaveCount(4);
  await expect(wizard(page).locator('.code-block').filter({ hasText: 'docker · dry-run' })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations.map(v => v.id)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await wizard(page).locator('.deployment-commands').screenshot({ path: `tmp/command-variants-evidence/${info.project.name}.png`, scale: 'css', animations: 'disabled', style: 'html{scroll-behavior:auto!important}.skip-link:not(:focus){visibility:hidden!important}' });
});

test('native MySQL keeps Bash and Python templates and explains both unavailable Docker commands', async ({ page }) => {
  await database(page);
  await wizard(page).getByRole('radio', { name: /^MySQL/ }).check();
  await wizard(page).getByRole('radio', { name: /^Native on this server/ }).check();
  await review(page);
  for (const runner of ['bash', 'python-native']) {
    await expect(card(page, runner).locator('pre')).toContainText("--db-root-password '<MYSQL_ROOT_PASSWORD>'");
    await expect(card(page, runner)).toContainText('TEMPLATE');
  }
  for (const runner of ['docker', 'python-docker']) {
    await expect(card(page, runner)).toContainText('Docker runners cannot provision a native database');
    await expect(card(page, runner).locator('pre')).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'EN / RU: Switch to Russian' }).click();
  await expect(card(page, 'docker')).toContainText('Docker runner не создаёт native-БД');
  await card(page, 'docker').getByRole('button', { name: /Проверить настройки/ }).click();
  await expect(wizard(page).getByRole('heading', { name: 'Где будут храниться данные.', exact: true })).toBeVisible();
});

test('a Python-specific toolkit path restriction does not hide compatible Bash and Docker outputs', async ({ page }) => {
  await database(page); await next(page); await next(page);
  await wizard(page).getByLabel('Native toolkit directory', { exact: true }).fill('/opt/toolkit,custom');
  await wizard(page).getByRole('button', { name: 'Review configuration', exact: true }).click();
  await expect(card(page, 'bash').locator('pre')).toContainText("'/opt/toolkit,custom/deploy-laravel.sh'");
  await expect(card(page, 'docker').locator('pre')).toBeVisible();
  await expect(card(page, 'python-docker').locator('pre')).toBeVisible();
  await expect(card(page, 'python-native')).toContainText('cannot contain commas');
  await expect(card(page, 'python-native').locator('pre')).toHaveCount(0);
});
