# Verification report

Local verification: 2026-10-23, Windows, Node.js 24.17.0/npm 11.13.0, Git Bash, Chromium 156 through Playwright 1.64.1. Optional Docker checks used client/daemon 29.9.2 and context desktop-linux (Linux amd64 daemon); Docker Desktop 4.96.2 was previously verified. Public fixture identities and domains are synthetic. No real passwords or infrastructure credentials were used. This report records the complete-form publication preflight. A successful workflow for its commit and separate hosted verification are required to establish publication; local checks alone do not establish it.

## Checks

| Check | Result / scope |
| --- | --- |
| Strict TypeScript and production Vite build | Passed; static dist/, no backend or Docker runtime |
| ESLint | Passed |
| Vitest unit tests | 241 passed; 34 Bash and 42 Docker integrations deliberately skipped in the ordinary command |
| Pinned upstream checks | Previous argument-release verification, unchanged argv contract: 34 passed: all namespace parser/reference coverage, deploy registry/help, 26 scenarios as argv/config, SSH key-path existence and 5 real Bash quoting/config round trips |
| Published Docker CLI checks | Previous argument-release verification, unchanged image/argv inputs: 42 passed: OCI identity, deployment/config scenarios, 26 audited file hashes, Python/completion previews, 8 extracted lifecycle parser cases, 2 offline Kubernetes renders and generated Compose validation |
| Browser/axe | Complete-form suite has 42 cases. Full run: 39 passed; three old selector/timing failures were corrected. All 10 focused final rerun cases passed, covering the corrected scenarios and all six new form journeys. This is coverage across runs, not one full 42-case success; evidence is in tmp/full-wizard-final/. Zero axe violations in checked form states |
| Production project Pages path | Passed for /fixture-repo/: asset responses, direct opening, refresh, desktop/mobile overflow, canonical, robots/sitemap and .nojekyll |
| npm audit --audit-level=low | Repeated for the complete-form publication preflight on 2026-10-23: 0 reported vulnerabilities, including development dependencies; dependency lockfile unchanged |
| Visual inspection | Desktop/mobile full Database and execution forms inspected; literal CLI labels, identities, conditional templates and field highlighting are readable. Checked states have no horizontal page overflow |

The browser suite covers minimal PostgreSQL, native MySQL template handling, presets, source transitions, existing-repo credential rejection, Horizon/Redis dependencies, custom port conflicts, endpoint consent, clipboard, config download, opt-in storage, Clear data, keyboard focus and English/Russian UI. Added journeys exercise the visible installation guide, image setup, shared runner selection, Docker preview/deploy/management/config, config download and native PostgreSQL fallback. Unit tests also reject native MySQL with Docker. Axe checks landing/wizard and final results on both viewport classes. Automated axe checks do not establish complete WCAG conformance or replace assistive-technology testing.

During the earlier installation/runner enhancement, one mobile run completed its flow/accessibility assertions but timed out saving a long full-page screenshot at device scale. Screenshots now use CSS pixel scale; that complete 16-test rerun passed. No product timeout or accessibility check was disabled.

## Docker image verification

Registry tag metadata was verified through Docker Hub's API; the cached image was pulled by immutable digest. Details and matching source identity are in [the compatibility audit](upstream-compatibility.md). Actual offline containers passed version/help and the 19 non-native deployment scenarios. Each scenario also read a synthetic config through a read-only mount. The exact generated POSIX preview command was parsed inside the image with a synthetic key path containing commas, quotes and spaces. A scoped Docker function dispatched only the informational CLI; Docker also parsed the fixture mount's CSV path. No production server mount or deploy command was executed.

SHA256 comparisons covered deployment/version files, list/update/backup scripts, runtime/proxy/endpoint/completion helpers, all modules/presets, preflight and the installed entrypoint. The 1.3.0 immutable image and its audited files match source pin 4dfec97, including its OCI revision label. Container dry-run's hardcoded ZIP prose still says `/tmp`; runtime code and image environment establish `/var/backups/laraship` and the UI documents that path.

Image impact: this static site has no Docker build. Upstream Dockerfile, entrypoint, installed scripts/templates and dependencies were not changed; rebuilding the published image would not be appropriate for this website enhancement. Containers ran with `--rm`, `--pull never`, `--network none` and no Docker socket. Only synthetic files were mounted read-only. These tests created no volumes or build caches; their created and remaining volume/cache usage is 0 bytes. Docker disk/builder usage was inspected and no labeled test containers/volumes remained. Shared cache ownership was not established as belonging to this task and was preserved; no broad cleanup or image deletion was performed.

## Python and completion verification

Unit tests cover all existing deployment settings through Python native, argument forwarding through --, immutable Docker image selection, management commands (including readonly SSH keys on updates), native DB fallback and Python Docker mount-path limitations. Completion tests exercise target requirements, independent legacy options, default password omission/explicit inclusion, timeout boundaries, consent, HTTPS defaults with acknowledged HTTP opt-in, absolute file paths, disabled settings and storage exclusion.

The earlier 21 shared scenarios included two final API dry-runs, with passwords omitted or explicitly included and a custom timeout. Source and image both accept argv and config without contacting that API. Four additional offline image checks parse the exact generated Bash, Docker, Python native and Python Docker preview commands. Root-owned private synthetic hooks/token files are created only inside disposable containers. Sentinel assertions prove dry-run does not execute the hook; network is disabled. Python source is mounted read-only from the audited fixture. The nested Docker executable is stubbed to inspect the adapter arguments and forward only to the packaged dry-run; it verifies network none, read-only inspection and explicit input mounts without server socket access. These are adapter/engine parsing checks, not a real Docker server deployment.

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
20. Final API completion with passwords omitted.
21. Final API completion with explicit password inclusion and custom timeout.
22. PostgreSQL and Redis custom-password templates.
23. MySQL app and container-root password templates.
24. Filament and Basic Auth password templates.
25. Explicit HTTP opt-in for both legacy and completion APIs.
26. Custom Laravel X.Y constraint (parser acceptance only).

Additional checks verify an existing local SSH key file path and literal apostrophes, dollar signs, semicolons, spaces, double quotes and backslashes as single Bash arguments. Upstream config parsing is also exercised. No hook is executed: the CLI exits at dry-run.

## Multiple-preset checks

Domain checks cover all eight subsets of the three presets, both selection orders for compatible pairs, repeated CLI/config entries, scalar overrides, additive locks, deselection/manual-service preservation, source restrictions and independent validation outside the UI. Preference checks migrate legacy single selections and filter corrupt/duplicate/incompatible arrays without persisting identity.

Browser journeys cover both compatible pairs through generated Bash/Docker commands and a downloaded config with two PRESET lines. They also check keyboard selection, accessible disabled reasons, manual service conflicts/recovery, source changes retaining staging, Russian explanations, legacy migration, saved arrays and Clear data. Axe initially found a mismatch between the reset button's visible text and accessible name; the button now uses its complete native text. New preset screenshots disable smooth scrolling during capture to avoid an observed screenshot-stability timeout.

## Review and boundaries

Self-review covered emitted flags, preset precedence, stale source-specific values, native DB meaning/fallback, reserved/duplicate ports, shell/config/CSV quoting, Docker access and readonly file mounts, image identity, URL credential rejection, pre-parser reserved action values, secret templates, persistence allowlist and deployment permissions. No independent reviewer was used because delegation was not authorized. No full deployment was attempted. Socket/host-network preflight and actual provisioning on a Linux server remain unverified.

GitHub Actions dependencies are pinned to exact official revision SHAs resolved during implementation.

## Complete-argument verification (2026-10-23)

The [coverage map](argument-coverage.md) records all 102 public entries and their UI locations. Five added shared scenarios exercise applicable password templates, both HTTP endpoint features with consent, and a syntactically valid custom Laravel constraint. No tested constraint establishes release availability. Unit coverage includes custom execution paths/env/argv, readonly archive-overlap prevention, placeholder substitution at actual flag positions, excluded browser storage, independent lifecycle namespaces and Kubernetes requirements.

Eight lifecycle image checks extract only the audited script's parse_args function, initialize a synthetic /tmp project/dump fixture and inspect parsed values. They never source a complete management script or call its main/operation function. Kubernetes tests render actual JSON with/without a worker using a non-root read-only offline container; generated Compose is parsed with docker compose config only. No update, restore, activation, removal, migration, cluster rollout or real hook/API delivery was performed.

Initial browser checks detected another project's app on the default port, a reference assertion's letter case, insufficient hint contrast and Windows timing limits. LaraShip now has a dedicated local preview on 4175, configurable LARASHIP_TEST_PORT, DOM-ready navigation and a title guard; generated tmp/report/result/build directories are excluded from the Vite watcher so their HTML cannot trigger app reloads; other project servers were preserved. Contrast was corrected, and long multistep journeys have a bounded 60-second test limit. Source scenario processes have a bounded 90-second timeout and 180-second argv/config case limit for Git Bash. A reference audit now extracts only each parser, avoiding internal Docker flags. An initial Pages browser timeout passed on an isolated rerun. No product checks or consent assertions were removed.

The last full 36-case browser run passed 34 cases; the two reference cases hit Windows navigation/scroll timing limits. After the DOM-ready/timeout/watcher fixes, their focused desktop/mobile rerun passed both, including source links, filtering, aliases, axe and overflow assertions (tmp/arguments-final-browser/.last-run.json). This was a focused rerun, not a claim that one final full command passed all 36. Tracing on Windows sometimes delays worker shutdown after assertions finish; a separate diagnostic rerun with tracing disabled also passed both cases without changing assertions. Browser evidence remains local and does not establish publication.

Image impact was reassessed: no build inputs changed, no rebuild/pull was needed. After all 42 image checks, zero labeled test containers/volumes remained. This task created no volumes/build caches (owned storage 0 bytes); shared builder cache was inspected and preserved. Ignored storage receipts are in tmp/docker-audit/arguments-{storage,builder}.txt.

Self-review covered all changed generators/forms, actual parser namespaces, shell/CSV/YAML quoting, optional argument applicability, custom paths/image trust, destructive intent, secret templates, export, preference exclusions and reset behavior. Independent delegation was not authorized. Fresh Ubuntu install/provisioning, custom administrative images, remote Git access, real database lifecycle operations and cluster deployment remain unverified.

## Complete wizard form (local only)

The wizard defaults to its full Advanced mode, retains an optional Basic view and resets to the full view. Every long deployment argument has a route in src/data/wizardArguments.ts; aliases/fixed values and informational commands are distinguished from deployment fields. Database names/users/ports and password templates are directly editable on Database, service identity/templates on Services, and Basic Auth/network/integration/runner/path/image/archive/mount settings in Fine-tuning. Search highlights and focuses applicable fields without changing source, database, module selection or trust. Validation sends database-port errors to step 2. Shared settings use unique textarea IDs. Search jumping forward does not mark invalid earlier steps complete. Highlighting is refreshed when the engine changes so a PostgreSQL search cannot leave a MySQL field highlighted; both viewport regressions passed separately in tmp/full-wizard-engine-final/.

Five new unit cases verify exhaustive routing, namespace boundaries, aliases, adapter locations and DB-port error placement. Six new browser journeys (three per viewport) exercise exact PostgreSQL identity/port output in Bash/Docker and exported config, invalid-port rejection at its field, MySQL root restrictions/native templates, preserved per-engine inputs, Basic/full mode search, optional storage privacy, Clear data/Russian UI, in-wizard execution settings and inspection copy without form submission. Axe and overflow are checked. Initial new-test language failure was an English region-name locator after switching Russian, corrected to the stable wizard container. Existing preset matching was tightened to distinguish the module from its now-visible password template; removed clicks targeted disclosures that are now always-visible fieldsets. The longer ports/consent journey has a bounded 60-second limit. Assertions and consent checks were preserved.

No dependency or container inputs changed. CLI argv/config generation is unchanged; 34 upstream and 42 offline image checks from the preceding argument release remain applicable and were not repeated for field placement. Current lint, strict TypeScript, unit/build and production Pages-path checks are recorded above. Source/image pins remain 1.3.0/4dfec97 and the same immutable digest. No infrastructure action or real secret was used. Desktop/mobile screenshots are in tmp/full-wizard-evidence/. The refinement was initially kept local as requested; the user subsequently authorized its commit, push and GitHub Pages publication. Lint, all 241 unit tests, strict TypeScript/build and dependency audit passed again before that publication. Workflow and hosted evidence are retained separately under ignored tmp/releases/.

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
- Secrets must be configured privately on the server. Browser password inputs and automatic slug generation are intentionally not offered. HTTP notification endpoints require explicit opt-in/acknowledgement and target trust. Multiple presets are allowed only when compatible with one another, the selected services and application source.

Screenshots and traces are local ignored artifacts in test-results/; HTML browser report is in playwright-report/. The workflow uploads them as a CI artifact. Re-run commands and prerequisites are in README.md.
