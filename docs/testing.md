# Verification report

Local verification: 2026-10-22, Windows, Node.js 24.17.0/npm 11.13.0, Git Bash, Chromium 156 through Playwright 1.64.1. Optional Docker checks used Docker Desktop 4.96.2, client/daemon 29.9.2 and context desktop-linux (Linux amd64 daemon). Public fixture identities and domains are synthetic. No real passwords or infrastructure credentials were used. The 1.3.0 compatibility enhancement checks below are local; they do not establish publication of these changes.

## Checks

| Check | Result / scope |
| --- | --- |
| Strict TypeScript and production Vite build | Passed; static dist/, no backend or Docker runtime |
| ESLint | Passed |
| Vitest unit tests | 183 passed; 28 Bash and 26 Docker integrations deliberately skipped in the ordinary command |
| Pinned upstream checks | 28 passed: parser registry, --help, 21 scenarios as argv and config, SSH key-path existence, 5 real Bash quoting/config round trips |
| Published Docker CLI checks | 26 passed: OCI version/revision/platform, version/help, 19 container-DB scenarios as argv/config, quoted readonly key path, 21 audited file hashes and 4 completion/Python runner checks |
| Browser/axe | 28 passed (14 desktop + 14 mobile) in the complete final rerun; zero axe violations in checked states |
| Production project Pages path | Passed for /fixture-repo/: asset responses, direct opening, refresh, desktop/mobile overflow, canonical, robots/sitemap and .nojekyll |
| npm audit --audit-level=low | Passed again before the multiple-preset release: 0 reported vulnerabilities, including development dependencies; dependencies are unchanged |
| Visual inspection | Desktop/mobile completion and preset screenshots inspected; all four runner commands, readable conflict reasons and expanded final results are covered. No horizontal page overflow |

The browser suite covers minimal PostgreSQL, native MySQL template handling, presets, source transitions, existing-repo credential rejection, Horizon/Redis dependencies, custom port conflicts, endpoint consent, clipboard, config download, opt-in storage, Clear data, keyboard focus and English/Russian UI. Added journeys exercise the visible installation guide, image setup, shared runner selection, Docker preview/deploy/management/config, config download and native PostgreSQL fallback. Unit tests also reject native MySQL with Docker. Axe checks landing/wizard and final results on both viewport classes. Automated axe checks do not establish complete WCAG conformance or replace assistive-technology testing.

During the earlier installation/runner enhancement, one mobile run completed its flow/accessibility assertions but timed out saving a long full-page screenshot at device scale. Screenshots now use CSS pixel scale; that complete 16-test rerun passed. No product timeout or accessibility check was disabled.

## Docker image verification

Registry tag metadata was verified through Docker Hub's API; the cached image was pulled by immutable digest. Details and matching source identity are in [the compatibility audit](upstream-compatibility.md). Actual offline containers passed version/help and the 19 non-native deployment scenarios. Each scenario also read a synthetic config through a read-only mount. The exact generated POSIX preview command was parsed inside the image with a synthetic key path containing commas, quotes and spaces. A scoped Docker function dispatched only the informational CLI; Docker also parsed the fixture mount's CSV path. No production server mount or deploy command was executed.

SHA256 comparisons covered deployment/version files, list/update/backup scripts, runtime/proxy/endpoint/completion helpers, all modules/presets, preflight and the installed entrypoint. The 1.3.0 immutable image and its audited files match source pin 4dfec97, including its OCI revision label. Container dry-run's hardcoded ZIP prose still says `/tmp`; runtime code and image environment establish `/var/backups/laraship` and the UI documents that path.

Image impact: this static site has no Docker build. Upstream Dockerfile, entrypoint, installed scripts/templates and dependencies were not changed; rebuilding the published image would not be appropriate for this website enhancement. Containers ran with `--rm`, `--pull never`, `--network none` and no Docker socket. Only synthetic files were mounted read-only. These tests created no volumes or build caches; their created and remaining volume/cache usage is 0 bytes. Docker disk/builder usage was inspected and no labeled test containers/volumes remained. Shared cache ownership was not established as belonging to this task and was preserved; no broad cleanup or image deletion was performed.

## Python and completion verification

Unit tests cover all existing deployment settings through Python native, argument forwarding through --, immutable Docker image selection, management commands (including readonly SSH keys on updates), native DB fallback and Python Docker mount-path limitations. Completion tests exercise target requirements, independent legacy options, default password omission/explicit inclusion, timeout boundaries, consent, HTTPS-only URLs, absolute file paths, disabled settings and storage exclusion.

The 21 shared scenarios add two final API dry-runs, with passwords omitted or explicitly included and a custom timeout. Source and image both accept argv and config without contacting that API. Four additional offline image checks parse the exact generated Bash, Docker, Python native and Python Docker preview commands. Root-owned private synthetic hooks/token files are created only inside disposable containers. Sentinel assertions prove dry-run does not execute the hook; network is disabled. Python source is mounted read-only from the audited fixture. The nested Docker executable is stubbed to inspect the adapter arguments and forward only to the packaged dry-run; it verifies network none, read-only inspection and explicit input mounts without server socket access. These are adapter/engine parsing checks, not a real Docker server deployment.

The published PyPI wheel SHA-256 was verified and its four adapter files matched source. The unpacked wheel returned laraship 1.3.0 inside an offline container. No fresh pip/pipx install or real release-download installation was performed on an Ubuntu host. Source/image, package metadata, requirements and installation examples were reviewed against the pinned upstream Python documentation.

New browser journeys cover Python pipx/venv instructions, native/Docker selection, completion script/API/token paths, HTTP/timeout rejection, trust consent, passwords off by default, all four generated runners, downloaded callback configuration, no browser API requests, preference exclusion, native DB fallback and Russian UI. Axe checks the expanded form and final results. Initial checks exposed badge contrast and radio names including unrelated descriptive text; final styles/label associations correct these issues. The complete 28-case rerun passed; a one-off earlier desktop timeout while advancing steps did not recur.

## Upstream scenarios

1. Minimal New Laravel 13, PostgreSQL Docker, HTTPS.
2. MySQL Docker with custom database identity.
3. PostgreSQL native with host listener port.
4. MySQL native, with a synthetic marked root-password placeholder in dry-run only.
5. Admin-panel preset: Filament/Redis/queue, required administrator email.
6. API preset: Horizon/Redis, PHP 16M.
7. Staging preset: Basic Auth/Redis.
8. Horizon dependency on Redis.
9. Backup module retention 14 days, separate project ZIP.
10. Existing public HTTPS repository with branch.
11. Existing SSH repository.
12. HTTP without certificate email.
13. Explicit project/DB/Redis ports.
14. API preset with additive Filament/backup and explicit PHP upload override.
15. Laravel 12, acknowledged single-line hook, project DH parameters and Basic Auth username.
16. Admin-panel plus staging, with Filament/Redis/queue and Basic Auth.
17. API plus staging selected in reverse order, with stable output, Horizon/Redis, Basic Auth and PHP 16M.
18. API plus staging with explicit PHP 256M and additive backup module.
19. Existing HTTPS repository with the compatible staging preset.

Additional checks verify an existing local SSH key file path and literal apostrophes, dollar signs, semicolons, spaces, double quotes and backslashes as single Bash arguments. Upstream config parsing is also exercised. No hook is executed: the CLI exits at dry-run.

## Multiple-preset checks

Domain checks cover all eight subsets of the three presets, both selection orders for compatible pairs, repeated CLI/config entries, scalar overrides, additive locks, deselection/manual-service preservation, source restrictions and independent validation outside the UI. Preference checks migrate legacy single selections and filter corrupt/duplicate/incompatible arrays without persisting identity.

Browser journeys cover both compatible pairs through generated Bash/Docker commands and a downloaded config with two PRESET lines. They also check keyboard selection, accessible disabled reasons, manual service conflicts/recovery, source changes retaining staging, Russian explanations, legacy migration, saved arrays and Clear data. Axe initially found a mismatch between the reset button's visible text and accessible name; the button now uses its complete native text. New preset screenshots disable smooth scrolling during capture to avoid an observed screenshot-stability timeout.

## Review and boundaries

Self-review covered emitted flags, preset precedence, stale source-specific values, native DB meaning/fallback, reserved/duplicate ports, shell/config/CSV quoting, Docker access and readonly file mounts, image identity, URL credential rejection, pre-parser reserved action values, secret templates, persistence allowlist and deployment permissions. No independent reviewer was used because delegation was not authorized. No full deployment was attempted. Socket/host-network preflight and actual provisioning on a Linux server remain unverified.

GitHub Actions dependencies are pinned to exact official revision SHAs resolved during implementation.

## GitHub publication

On 2026-10-22 the user authorized committing, pushing and enabling Pages for [shellharbor/laraship-docs](https://github.com/shellharbor/laraship-docs). Initial source commit: `2110bdbfc37ef76c5c49593bee6ed0401453880d`.

The `check` job in [the first workflow run](https://github.com/shellharbor/laraship-docs/actions/runs/39796257837) completed successfully on GitHub-hosted Ubuntu: lockfile installation, lint, unit tests, pinned upstream dry-run tests, Playwright desktop/mobile tests, production Pages-path smoke, production build, browser report and Pages artifact upload. The downloaded Pages artifact was independently inspected: canonical URL and asset paths target `https://shellharbor.github.io/laraship-docs/` and `/laraship-docs/`.

Pages is configured with `build_type=workflow`, HTTPS enforced and deployment permitted from `main`. Initial publication was delayed during a GitHub Actions results incident beginning at 14:18 UTC on 2026-10-22. Later verification confirmed [workflow 39798570550](https://github.com/shellharbor/laraship-docs/actions/runs/39798570550) completed successfully for commit 8e9dc2982aa86495104a1f22ba2689a1c9fc3d22: push event, main branch and successful check/deploy jobs. Initial reporting lag is historical, not an unresolved publication failure.

The installation/runner update was subsequently published as commit `0dbbfa79c5e1c65aabf2ab19a33022b395dd0e33`. [Workflow 39806621014](https://github.com/shellharbor/laraship-docs/actions/runs/39806621014) passed check/deploy; public desktop/mobile smoke at 15:47 UTC on 2026-10-22 confirmed installation, Docker/Bash commands, native fallback, language switching, reload and matching JS/CSS hashes. A separate successful workflow and hosted smoke are required to establish publication of the multiple-preset changes; local checks alone do not prove that the live site has updated.

Hosted smoke verification began at 14:44 UTC (17:44 Moscow) on 2026-10-22 against [the live site](https://shellharbor.github.io/laraship-docs/): HTTP 200, correct page title, complete minimal PostgreSQL Docker wizard journey, expected generated slug/DB arguments, page refresh, English/Russian switching, no horizontal overflow and no persisted form data. Desktop 1440×1000 and mobile 390×844 both passed with zero page errors or HTTP error responses. Local evidence is in ignored test-results/published-smoke.json and published desktop/mobile screenshots. Subsequent publication documentation commits do not change application assets; their automatic workflow runs remain visible under [Actions](https://github.com/shellharbor/laraship-docs/actions).

Remaining release verification:

- No custom domain was requested; DNS/custom-domain verification does not apply to this standard github.io publication.
- Real Ubuntu provisioning, Docker services, DNS/ACME, remote SSH/Git permissions and native DB connectivity are outside this static generator test scope.
- The HTTPS endpoint adapter is checked by local validation and browser consent tests. No real endpoint or project credentials were contacted/sent.
- Browser coverage uses Chromium with desktop/mobile viewport emulation; Safari, Firefox and screen-reader sessions remain unverified.
- Secrets must be configured privately on the server. Insecure HTTP notification endpoints, browser password inputs and automatic slug generation are intentionally not offered. Multiple presets are allowed only when compatible with one another, the selected services and application source.

Screenshots and traces are local ignored artifacts in test-results/; HTML browser report is in playwright-report/. The workflow uploads them as a CI artifact. Re-run commands and prerequisites are in README.md.
