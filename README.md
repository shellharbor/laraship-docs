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
- Multiple compatible admin-panel/api/staging presets; automatic dependencies and explained conflict blocks.
- Advanced names/users, host ports, Basic Auth user, PHP upload limits, project ZIP, project DH parameters, HTTPS endpoint and an explicitly acknowledged Expert hook.
- Deterministic quoted deploy/dry-run commands and a local `deploy.config` download.
- Visible English/Russian installation guide and a shared Bash/Docker CLI runner choice. Runner choice is held in memory only.

The Redis container belongs to LaraShip's base stack; its module configures Laravel cache/session/queue integration. The scheduled database backup module is distinct from a one-time project ZIP.

### Combine presets

Select presets independently in **Start with a preset**. `admin-panel + staging` combines the admin panel/queue stack with Basic Auth; `api + staging` combines Horizon/16M uploads with Basic Auth. `admin-panel + api` is blocked because Queue worker and Horizon conflict. Existing repositories allow staging; presets that install Filament/Horizon require a new application. Already selected manual queue services also block conflicting presets, with visible recovery instructions.

Unchecking a preset removes its contributions while preserving manual service choices. **No presets** clears the selected presets. Included modules and staging's Basic Auth stay locked while a selected preset requires them. Switching to an existing repository removes new-app-only presets and retains staging.

Commands repeat `--preset NAME`, and config exports repeat `PRESET="NAME"` on separate lines. Both use stable registry order (admin-panel, api, staging), independent of click order. Modules/auth combine additively; an explicit PHP upload override wins. Optional saved preferences migrate the old single `preset` value to a `presets` array under the existing storage key. Unknown, duplicate, source-incompatible and conflicting saved preset choices are filtered; manually selected services take priority during restoration. Identity and other private fields remain excluded.

## Install LaraShip on the target server

The website's **Installation** section comes before the configurator. It explains the toolkit, SSH workflow, Ubuntu prerequisites, DNS/ports and both installation methods. Application services use Docker with either CLI runner.

- **Bash script:** install the listed host packages, clone the complete official repository into a previously absent `/opt/laraship`, and check out the audited source revision. Do not download the deployment script alone. Review the toolkit before using sudo. Docker Compose V2 must be available when Docker is already installed; LaraShip can install Docker CE when absent.
- **Docker image:** install Docker Engine on a supported Linux amd64 server first ([official Ubuntu guide](https://docs.docker.com/engine/install/ubuntu/)), then pull and inspect the published CLI image. It already includes the toolkit, Docker client and Compose plugin. A separate source checkout is optional.

The image is `shellharbor/laraship:1.2.2`, pinned in generated commands to `shellharbor/laraship@sha256:ddc03c1636a48e6d4e290cc5ba32f502995314335603139db16d938d63a3ab8b`. Registry metadata and OCI labels were verified on 2026-10-22. Its source label is `39f150b133744752433f02c30395767d541f133a`; audited CLI files were compared with the website's source pin, rather than assuming these two revisions are identical. See the [compatibility audit](docs/upstream-compatibility.md).

Docker deploy/management commands use the target server's Docker socket, host networking and identical host/container paths for `/var/www`, `/run/lock/laraship` and `/var/backups/laraship`. Create those directories first using the guide. Docker socket access grants administrative control; review and trust the image. This adapter is for a Linux server, not Docker Desktop path mapping or a remote daemon. Informational `--version`, help and ordinary dry-run need no socket or deployment mounts. A supplied SSH key and configuration file are mounted read-only at their absolute server paths. Replace every occurrence of the config path after uploading the file to the server.

**Native PostgreSQL/MySQL provisioning requires Bash on the host.** The wizard explains the limitation and emits Bash when native DB is selected, even if Docker was preferred earlier. Docker choice becomes available again with a container database. A project ZIP defaults to `/tmp` under Bash and `/var/backups/laraship` under Docker; database dumps are separate.

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

Optional published-image checks require Docker client/daemon, the source fixture above and the exact image already pulled after review:

```sh
docker pull shellharbor/laraship@sha256:ddc03c1636a48e6d4e290cc5ba32f502995314335603139db16d938d63a3ab8b
npm run test:docker
```

These tests never pull automatically, mount a Docker socket or deploy an application. They run offline informational containers, readonly synthetic file fixtures and compare audited image files with source. Test containers use `--rm` and a per-run ownership label; the wrapper removes only leftovers carrying that exact run label. No test volumes or build caches are created. Ordinary `npm test` and CI skip Docker integration; the browser and unit checks still cover both command formats.

## GitHub Pages

The independent site repository is [shellharbor/laraship-docs](https://github.com/shellharbor/laraship-docs). Its project Pages path is `/laraship-docs/`; the workflow derives this from the actual repository name.

1. Put the site in its own GitHub repository, using `main` as the default branch.
2. In repository Settings → Pages, select **GitHub Actions** as the source.
3. The [workflow](.github/workflows/pages.yml) checks lint/unit/upstream/browser tests, builds and deploys `dist/` using `actions/deploy-pages`. Pull requests only run checks.
4. It derives Vite's project base from the actual repository name. `owner.github.io` repositories use `/`. No repository name is hard-coded.
5. Optionally set the `CUSTOM_DOMAIN` repository variable to a DNS hostname, configure that domain in Pages and its DNS. The workflow uses `/` and emits `CNAME`. For an alternative verified production origin, `SITE_URL` controls canonical/sitemap metadata. No canonical origin is guessed for local builds.

Only the deployment job receives `pages: write` and `id-token: write`; checks use `contents: read`. A single page with an in-page wizard avoids history-routing 404s. `.nojekyll` is emitted in every build. Production metadata includes title, description, OpenGraph, favicon and robots; canonical and sitemap are emitted when `SITE_URL` is known.

For a local project-path build, set `BASE_PATH=/your-repository/` and `SITE_URL=https://your-verified-host/your-repository` before `npm run build`. For a custom-domain build use `BASE_PATH=/`.

The published site is [shellharbor.github.io/laraship-docs](https://shellharbor.github.io/laraship-docs/). The public HTTPS URL and the complete wizard journey were verified on desktop and mobile on 2026-10-22; see the verification report. Pushes to main automatically run checks and publish the site. Real server provisioning remains outside this website's release checks.
