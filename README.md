# LaraShip Setup Wizard

A static React + TypeScript configurator for [LaraShip](https://github.com/shellharbor/laraship). It generates commands in the browser for an Ubuntu server; it never connects to that server or performs a deployment itself.

The CLI contract is pinned to **LaraShip 1.2.2**, commit `a60817564e2e9efe018bbcaee9f8ba1173464ff6`. See the [audit](docs/upstream-compatibility.md), [complete option registry](docs/cli-options.md), and [verification report](docs/testing.md).

## Develop

Use Node.js 24 (tested with 24.17.0) and npm. Install with the committed lockfile:

```sh
npm ci
npm run dev
```

The printed localhost URL opens the configurator. English is the default, with a Russian language toggle. Basic/Advanced changes field visibility; previously entered advanced settings stay active and appear in the result. There is no backend, analytics, remote font, database, API key or user account. All application assets are bundled locally.

```sh
npm run lint
npm test
npm run build
npm run preview
```

Production files are in `dist/`. No Docker image is required or supplied by this website.

## Supported choices

- New Laravel ^13.0/^12.0 or an existing HTTPS/SSH Git repository.
- PostgreSQL 17 or MySQL 8.4, in Docker or native on the same Ubuntu host.
- HTTPS by default; optional HTTP, Filament, Redis integration, queue worker, Horizon and database backups.
- Additive admin-panel/api/staging presets; automatic dependencies and blocked conflicts.
- Advanced names/users, host ports, Basic Auth user, PHP upload limits, project ZIP, project DH parameters, HTTPS endpoint and an explicitly acknowledged Expert hook.
- Deterministic quoted deploy/dry-run commands and a local `deploy.config` download.

The Redis container belongs to LaraShip's base stack; its module configures Laravel cache/session/queue integration. The scheduled database backup module is distinct from a one-time project ZIP.

## Secrets and validation boundary

There are no password fields. LaraShip generates secrets on the server. **Native MySQL needs its existing root password**: the wizard produces a clearly marked template containing `<MYSQL_ROOT_PASSWORD>` and offers a Bash hidden-input snippet to use on the server. The underlying CLI still exposes that password in process arguments; hidden input does not solve `ps` visibility. Never paste it into this website. Protect LaraShip terminal output because it prints generated credentials.

Optional persistent storage contains only an allowlist of stack preferences, not emails, domain/slug, repository URL, key path, endpoint, commands or passwords. It is off by default; Clear data resets everything. Config export includes entered non-password settings and can include a sensitive URL/hook: review it, keep it out of Git and use `chmod 600`. Do not source the config as shell code.

The browser validates syntax and compatibility, not DNS, ACME, SSH keys, open ports, Ubuntu packages or database connectivity. Native databases must already be installed and configured for Docker access. Existing repositories need `artisan` and `composer.json` at their root and prebuilt frontend assets. A deployment refuses an existing project directory.

## Browser and upstream checks

```sh
npx playwright install chromium
npm run test:e2e
npm run test:pages
```

The browser suite covers desktop/mobile journeys, keyboard focus, axe accessibility, consent, clipboard, export and storage privacy. `test:pages` builds a separate fixture in `tmp/pages-build` and tests a real `/fixture-repo/` production path, assets, refresh and metadata. Reports, screenshots and traces are ignored build artifacts in `test-results/` and `playwright-report/`.

Upstream differential tests require a full pinned source checkout. Review that source before executing it. The tests execute **only `--help` and `--dry-run`**, never a deployment or post-deploy hook:

```sh
git clone https://github.com/shellharbor/laraship.git tmp/upstream-laraship
git -C tmp/upstream-laraship checkout --detach a60817564e2e9efe018bbcaee9f8ba1173464ff6
npm run test:upstream
```

On Windows, install Git Bash or set `BASH_BIN` to its executable. `LARASHIP_UPSTREAM_DIR` can select an already reviewed checkout. Without the explicit upstream command, its tests are skipped. Ordinary unit tests do not fetch or execute upstream code. Regenerate `docs/cli-options.md` with `node scripts/write-cli-reference.mjs` after intentional registry edits.

## GitHub Pages

The independent site repository is [shellharbor/laraship-docs](https://github.com/shellharbor/laraship-docs). Its project Pages path is `/laraship-docs/`; the workflow derives this from the actual repository name.

1. Put the site in its own GitHub repository, using `main` as the default branch.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. The [workflow](.github/workflows/pages.yml) checks lint/unit/upstream/browser tests, builds and deploys `dist/` using `actions/deploy-pages`. Pull requests only run checks.
4. It derives Vite's project base from the actual repository name. `owner.github.io` repositories use `/`. No repository name is hard-coded.
5. Optionally set the `CUSTOM_DOMAIN` repository variable to a DNS hostname, configure that domain in Pages and its DNS. The workflow uses `/` and emits `CNAME`. For an alternative verified production origin, `SITE_URL` controls canonical/sitemap metadata. No canonical origin is guessed for local builds.

Only the deployment job receives `pages: write` and `id-token: write`; checks use `contents: read`. A single page with an in-page wizard avoids history-routing 404s. `.nojekyll` is emitted in every build. Production metadata includes title, description, OpenGraph, favicon and robots; canonical and sitemap are emitted when `SITE_URL` is known.

For a local project-path build, set `BASE_PATH=/your-repository/` and `SITE_URL=https://your-verified-host/your-repository` before `npm run build`. For a custom-domain build use `BASE_PATH=/`.

The expected standard Pages URL is `https://shellharbor.github.io/laraship-docs/`. Publication is verified separately from local builds; see the verification report for the actual deployment result. Real server provisioning remains outside this website's release checks.
