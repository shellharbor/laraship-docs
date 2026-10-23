import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

test.describe.configure({ timeout: 90000 });
const wizard = (page: Page) => page.locator('#configure');
const next = (page: Page) => wizard(page).getByRole('button', { name: 'Continue', exact: true }).click();
async function find(page: Page, flag: string) {
  await wizard(page).getByLabel('Find a setting by CLI argument').fill(flag);
  await wizard(page).locator('.wizard-argument-matches').getByRole('button').filter({ hasText: flag }).first().click();
}
async function identity(page: Page) {
  await wizard(page).getByLabel('Project slug', { exact: true }).fill('custom-db');
  await wizard(page).getByLabel('Domain', { exact: true }).fill('app.example.com');
  await wizard(page).getByLabel('Certificate contact email').fill('operator@example.com');
}
async function axe(page: Page) { expect((await new AxeBuilder({ page }).analyze()).violations.map(({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) }))).toEqual([]); }
test.beforeEach(async ({ page }) => { await page.goto('/', { waitUntil: 'domcontentloaded' }); await expect(page).toHaveTitle(/LaraShip/); });

test('full wizard edits database identity, services and ports directly and exports their exact arguments', async ({ page }, info) => {
  const w = wizard(page);
  await expect(w.getByRole('button', { name: 'Advanced', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await w.getByRole('checkbox', { name: /^Remember non-sensitive preferences/ }).check();
  await find(page, '--db-postgres-user');
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toBeFocused();
  await expect(w.getByRole('navigation').getByRole('button', { name: /Domain & HTTPS/ }).locator('.step-number.complete')).toHaveCount(0);
  await w.getByLabel('Database user (optional)', { exact: true }).fill('custom_pg_user');
  await w.getByLabel('Database name (optional)', { exact: true }).fill('custom_pg_database');
  await w.getByLabel('Database port (optional)', { exact: true }).fill('65536');
  await next(page);
  await expect(w.getByRole('alert')).toContainText('65535');
  await w.getByLabel('Database port (optional)', { exact: true }).fill('5544');
  await w.screenshot({ path: `tmp/full-wizard-evidence/${info.project.name}-database.png`, scale: 'css', animations: 'disabled', style: 'html{scroll-behavior:auto!important}.skip-link:not(:focus){visibility:hidden!important}' });
  await w.getByRole('navigation').getByRole('button', { name: /Domain & HTTPS/ }).click();
  await identity(page); await next(page); await next(page);
  await w.getByRole('checkbox', { name: /^Filament admin/ }).check();
  await w.getByLabel('Filament administrator email').fill('admin@example.com');
  await w.getByLabel('Administrator name (optional)').fill('Site Admin');
  await w.getByRole('checkbox', { name: /^Database backups/ }).check();
  await w.getByLabel('Keep database dumps for').fill('14');
  await next(page);
  await w.getByRole('checkbox', { name: /^HTTP Basic Auth/ }).check();
  await w.getByLabel('Basic Auth user (optional)').fill('preview_user');
  for (const [label, value] of [['HTTP', '8150'], ['HTTPS', '4250'], ['PHP', '9150'], ['REDIS', '6650']]) await w.getByLabel(label, { exact: true }).fill(value);
  await w.getByRole('checkbox', { name: /^Create project ZIP/ }).check();
  await w.getByRole('checkbox', { name: /^Generate project DH/ }).check();
  await axe(page);
  await w.getByRole('button', { name: 'Review configuration', exact: true }).click();
  const deploy = w.locator('.deployment-variant[data-runner="bash"] .code-block');
  for (const value of ["--db-postgres-user 'custom_pg_user'", "--db-postgres-name 'custom_pg_database'", "--port-postgres '5544'", "--filament-name 'Site Admin'", "--auth-user 'preview_user'", "--backup-keep '14'", '--create-backup', '--create-dhparam']) await expect(deploy).toContainText(value);
  await w.getByText('Prefer a configuration file?', { exact: true }).click();
  const downloading = page.waitForEvent('download');
  await w.getByRole('button', { name: 'Download configuration', exact: true }).click();
  const config = await readFile((await (await downloading).path())!, 'utf8');
  expect(config).toContain('DB_POSTGRES_USER="custom_pg_user"');
  expect(config).toContain('DB_POSTGRES_NAME="custom_pg_database"');
  expect(config).toContain('PORT_POSTGRES="5544"');
  await w.getByRole('radio', { name: 'Docker image', exact: true }).first().check();
  await expect(w.locator('.deployment-variant[data-runner="docker"] .code-block')).toContainText("--db-postgres-user 'custom_pg_user'");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('laraship-preferences-v1'))).not.toMatch(/custom_pg_user|custom_pg_database|preview_user|operator@example/);
});

test('engine-specific fields, native templates, Basic mode and argument search preserve explicit choices', async ({ page }) => {
  const w = wizard(page);
  await find(page, '--db-postgres-user');
  await w.getByLabel('Database user (optional)', { exact: true }).fill('pg_user');
  await w.getByRole('radio', { name: /^MySQL/ }).check();
  await expect(w.locator('.argument-highlight')).toHaveCount(0);
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toHaveValue('');
  await w.getByLabel('Database user (optional)', { exact: true }).fill('root');
  await next(page); await expect(w.getByRole('alert')).toContainText('separate application user');
  await w.getByLabel('Database user (optional)', { exact: true }).fill('mysql_app');
  await w.getByRole('checkbox', { name: /^MySQL application password/ }).check();
  await expect(w.getByRole('checkbox', { name: /^MySQL container root password/ })).toBeVisible();
  await w.getByRole('radio', { name: /^Native on this server/ }).check();
  await expect(w.getByRole('checkbox', { name: /^MySQL container root password/ })).toHaveCount(0);
  await expect(w.locator('[data-cli-flag="--db-root-password"]')).toContainText('<MYSQL_ROOT_PASSWORD>');
  await w.getByRole('radio', { name: /^PostgreSQL/ }).check();
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toHaveValue('pg_user');
  await w.getByRole('button', { name: 'Basic', exact: true }).click();
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toHaveCount(0);
  await find(page, '--db-postgres-user');
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toHaveValue('pg_user');
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toBeFocused();
  await w.getByRole('button', { name: 'Clear data', exact: true }).click();
  await expect(w.getByLabel('Find a setting by CLI argument')).toHaveValue('');
  await find(page, '--db-postgres-user');
  await expect(w.getByLabel('Database user (optional)', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: 'EN / RU: Switch to Russian' }).click();
  await expect(w.getByLabel('Пользователь БД (необязательно)', { exact: true })).toBeVisible();
  await expect(w.locator('.cli-flags')).toContainText(['--db-type', '--db-native', '--db-postgres-name', '--db-postgres-user', '--port-postgres', '--db-postgres-password']);
});

test('execution and inspection controls work inside the wizard without duplicate input IDs or form submission', async ({ page }, info) => {
  const w = wizard(page);
  await find(page, '--directory');
  await w.getByLabel('Native toolkit directory', { exact: true }).fill('/opt/toolkit-custom');
  await w.getByLabel('Configuration file path on server').fill('/root/custom.config');
  await w.getByRole('radio', { name: 'Python CLI · Docker', exact: true }).check();
  await expect(w.getByLabel('Native toolkit directory', { exact: true })).toHaveCount(0);
  await w.getByLabel('Docker archive directory', { exact: true }).fill('/srv/archives');
  await w.getByLabel('Additional read-only server inputs').fill('/root/custom-input');
  await w.getByLabel('Administrative CLI image').fill('shellharbor/laraship:1.3.0');
  await w.getByRole('button', { name: 'Review configuration', exact: true }).click();
  await expect(w.getByRole('alert')).toContainText('trust');
  await w.getByRole('checkbox', { name: /^I trust this administrative image/ }).check();
  await find(page, '--list-presets');
  await w.getByLabel('Informational CLI action').selectOption('--list-presets');
  await expect(w.locator('.code-block')).toContainText('deploy --backend docker');
  await expect(w.locator('.code-block')).toContainText('-- --list-presets');
  await w.getByRole('button', { name: 'Copy informational command', exact: true }).click();
  await expect(w.getByRole('heading', { name: 'Make it yours.', exact: true })).toBeVisible();
  await axe(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await w.screenshot({ path: `tmp/full-wizard-evidence/${info.project.name}-runtime.png`, scale: 'css', animations: 'disabled', style: 'html{scroll-behavior:auto!important}.skip-link:not(:focus){visibility:hidden!important}' });
  await w.getByRole('radio', { name: 'Python CLI · native', exact: true }).check();
  await expect(w.getByLabel('Native toolkit directory', { exact: true })).toHaveValue('/opt/toolkit-custom');
});
