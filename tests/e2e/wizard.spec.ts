import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

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
for (const primary of ['admin-panel', 'api'] as const) {
  test(`${primary} combines with staging, blocks conflicts, and exports both presets`, async ({ page }, info) => {
    if (primary === 'api') await page.locator('#installation').getByRole('radio', { name: 'Docker image' }).check();
    await page.getByRole('checkbox', { name: primary, exact: true }).check();
    const staging = page.getByRole('checkbox', { name: 'staging', exact: true });
    await staging.focus(); await page.keyboard.press('Space');
    await expect(staging).toBeChecked();
    const blocked = page.getByRole('checkbox', { name: primary === 'api' ? 'admin-panel' : 'api', exact: true });
    await expect(blocked).toBeDisabled();
    await expect(blocked).toHaveAccessibleDescription(/Cannot combine with.*conflicts with/);
    await checkAccessibility(page);
    await page.locator('.presets').screenshot({ path: `test-results/${info.project.name}-${primary}-staging.png`, scale: 'css', animations: 'disabled', style: 'html { scroll-behavior: auto !important; }' });
    await next(page); await identity(page); await next(page); await next(page);
    if (primary === 'admin-panel') await page.getByLabel('Filament administrator email').fill('admin@example.com');
    await expect(page.getByRole('checkbox', { name: primary === 'api' ? /^Horizon/ : 'Queue worker' })).toBeChecked();
    await next(page);
    await expect(page.getByRole('checkbox', { name: /^HTTP Basic Auth/ })).toBeChecked();
    await expect(page.getByRole('checkbox', { name: /^HTTP Basic Auth/ })).toBeDisabled();
    await page.getByRole('button', { name: 'Review configuration' }).click();
    const command = wizard(page).locator('.code-block').filter({ hasText: `${primary === 'api' ? 'docker' : 'bash'} · deploy` });
    await expect(command).toContainText(`--preset '${primary}'`);
    await expect(command).toContainText("--preset 'staging'");
    await expect(command).toContainText('--enable-basic-auth');
    await page.getByText('Prefer a configuration file?', { exact: true }).click();
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download configuration' }).click();
    const file = await (await download).path();
    expect(await readFile(file!, 'utf8')).toContain(`PRESET="${primary}"\nPRESET="staging"`);
    await wizard(page).getByRole('button', { name: 'Application', exact: true }).click();
    await page.getByRole('checkbox', { name: primary, exact: true }).uncheck();
    await expect(staging).toBeChecked();
    await expect(blocked).toBeEnabled();
    await page.getByRole('button', { name: /^No presets/ }).click();
    await expect(staging).not.toBeChecked();
    await expect(page.getByRole('button', { name: /^No presets/ })).toHaveAttribute('aria-pressed', 'true');
  });
}
test('manual queue services block presets with recovery instructions', async ({ page }) => {
  await next(page); await identity(page); await next(page); await next(page);
  await page.getByRole('checkbox', { name: /^Horizon/ }).check();
  await wizard(page).getByRole('button', { name: 'Application', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'admin-panel', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'admin-panel', exact: true })).toHaveAccessibleDescription(/Remove the selected Horizon/);
  await page.getByRole('checkbox', { name: 'staging', exact: true }).check();
  await wizard(page).getByRole('button', { name: 'Services', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /^Horizon/ })).toBeChecked();
  await page.getByRole('checkbox', { name: /^Horizon/ }).uncheck();
  await page.getByRole('checkbox', { name: 'Queue worker' }).check();
  await wizard(page).getByRole('button', { name: 'Application', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toHaveAccessibleDescription(/Remove the selected Queue worker/);
  await expect(page.getByRole('checkbox', { name: 'admin-panel', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: /^No presets/ }).click();
  await wizard(page).getByRole('button', { name: 'Services', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Queue worker' })).toBeChecked();
});
test('combined source transition, Russian reasons and legacy preferences migration', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('laraship-preferences-v1', JSON.stringify({ preset: 'api' })));
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toBeChecked();
  await page.getByRole('checkbox', { name: 'staging', exact: true }).check();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'staging', exact: true })).toBeChecked();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('laraship-preferences-v1')!));
  expect(saved.presets).toEqual(['api', 'staging']); expect(saved).not.toHaveProperty('preset');
  await page.getByRole('radio', { name: 'Existing repository' }).check();
  await expect(page.getByRole('checkbox', { name: 'staging', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toHaveAccessibleDescription(/New applications only/);
  await page.getByRole('button', { name: 'Switch to Russian' }).click();
  await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toHaveAccessibleDescription(/Только для нового приложения/);
  await expect(page.locator('.preset-selection')).toContainText('Выбраны: staging');
  await page.getByRole('button', { name: 'Очистить данные' }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test('installation, Docker CLI commands, config mounts, language and accessibility', async ({ page }, info) => {
  const installation = page.locator('#installation');
  await expect(installation.getByRole('heading', { name: 'First, get LaraShip ready.' })).toBeVisible();
  await expect(installation).toContainText('sudo git clone');
  await installation.getByRole('radio', { name: 'Docker image' }).check();
  await expect(installation).toContainText('docker pull shellharbor/laraship@sha256:');
  await expect(installation).toContainText('linux/amd64');
  await expect(installation).toContainText('Docker socket access grants administrative control');
  await installation.screenshot({ path: `test-results/${info.project.name}-docker-installation.png`, scale: 'css' });
  await page.getByRole('button', { name: 'Switch to Russian' }).click();
  await expect(installation).toContainText('Установите Docker Engine на сервере');
  await expect(installation.getByRole('radio', { name: 'Docker-образ' })).toBeChecked();
  await page.getByRole('button', { name: 'Switch to English' }).click();
  await next(page); await identity(page); await next(page); await result(page);
  const output = wizard(page);
  await expect(output.getByRole('radio', { name: 'Docker image', exact: true }).first()).toBeChecked();
  const deploy = output.locator('.code-block').filter({ hasText: 'docker · deploy' });
  const preview = output.locator('.code-block').filter({ hasText: 'docker · dry-run' });
  await expect(deploy).toContainText('sudo docker run --rm -it --network host');
  await expect(deploy).toContainText('src=/var/run/docker.sock,dst=/var/run/docker.sock');
  await expect(deploy).toContainText('src=/var/backups/laraship,dst=/var/backups/laraship');
  await expect(deploy).toContainText("--slug 'my-app'");
  await expect(preview).toContainText('deploy --dry-run');
  await expect(preview).not.toContainText('/var/run/docker.sock');
  await output.getByText('Prefer a configuration file?', { exact: true }).click();
  await expect(output.locator('.code-block').filter({ hasText: 'docker · config' })).toContainText('src=/path/to/deploy.config,dst=/path/to/deploy.config,readonly');
  const download = page.waitForEvent('download');
  await output.getByRole('button', { name: 'Download configuration' }).click();
  expect((await download).suggestedFilename()).toBe('deploy.config');
  await expect(output.locator('.code-block').filter({ hasText: 'docker · management' })).toContainText("'list'");
  await checkAccessibility(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await output.getByRole('radio', { name: 'Bash script', exact: true }).first().check();
  await expect(output.locator('.code-block').filter({ hasText: 'bash · deploy' })).toContainText('sudo bash /opt/laraship/deploy-laravel.sh');
  await expect(installation.getByRole('radio', { name: 'Bash script' })).toBeChecked();
});
test('native PostgreSQL forces Bash while Docker remains a separate installation option', async ({ page }) => {
  await page.locator('#installation').getByRole('radio', { name: 'Docker image' }).check();
  await next(page); await identity(page); await next(page);
  await page.getByRole('radio', { name: 'Native on this server' }).check();
  await result(page);
  await expect(wizard(page).getByRole('radio', { name: 'Docker image', exact: true }).first()).toBeDisabled();
  await expect(wizard(page).getByRole('radio', { name: 'Bash script', exact: true }).first()).toBeChecked();
  await expect(wizard(page)).toContainText('Using Bash: the Docker CLI image cannot provision native databases');
  await expect(wizard(page).locator('.code-block').filter({ hasText: 'bash · deploy' })).toContainText('--db-native');
  await expect(wizard(page).locator('.code-block').filter({ hasText: 'docker · deploy' })).toHaveCount(0);
});
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
  await page.screenshot({ path: `test-results/${info.project.name}-result.png`, fullPage: true, scale: 'css' });
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
  await page.getByRole('checkbox', { name: 'admin-panel', exact: true }).check();
  await next(page); await identity(page); await next(page); await next(page);
  await expect(page.getByRole('checkbox', { name: 'Filament admin' })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'Queue worker' })).toBeDisabled();
  await expect(page.getByRole('checkbox', { name: /^Horizon/ })).toBeDisabled();
  await page.getByLabel('Filament administrator email').fill('admin@example.com');
  await wizard(page).getByRole('button', { name: 'Application', exact: false }).click();
  await page.getByRole('radio', { name: 'Existing repository' }).check();
  await expect(page.getByRole('button', { name: /^No presets/ })).toHaveAttribute('aria-pressed', 'true');
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
  await page.getByRole('checkbox', { name: 'api', exact: true }).check();
  await page.getByRole('checkbox', { name: 'staging', exact: true }).check();
  await page.getByRole('checkbox', { name: 'Remember non-sensitive preferences' }).check();
  await next(page); await identity(page);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toMatch(/operator|example|my-app/);
  await page.reload(); await expect(page.getByRole('checkbox', { name: 'api', exact: true })).toBeChecked();
  await expect(page.getByRole('checkbox', { name: 'staging', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Clear data' }).click();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await expect(page.getByRole('button', { name: /^No presets/ })).toHaveAttribute('aria-pressed', 'true');
});
test('keyboard navigation, Russian toggle and responsive landing', async ({ page }, info) => {
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to configurator' })).toBeFocused();
  await checkAccessibility(page);
  await page.screenshot({ path: `test-results/${info.project.name}-landing.png`, fullPage: true, scale: 'css' });
  await page.getByRole('button', { name: 'Switch to Russian' }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.getByRole('heading', { name: 'Что разворачиваем?' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Новое приложение Laravel' })).toBeChecked();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Введите DNS-имя');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
