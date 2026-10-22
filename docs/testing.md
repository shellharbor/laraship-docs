# Verification report

Local verification: 2026-10-22, Windows, Node.js 24.17.0/npm 11.13.0, Git Bash, Chromium 156 through Playwright 1.64.1. Public fixture identities and domains are synthetic. No real passwords or infrastructure credentials were used.

## Checks

| Check | Result / scope |
| --- | --- |
| Strict TypeScript and production Vite build | Passed; static dist/, no backend or Docker runtime |
| ESLint | Passed |
| Vitest unit tests | 84 passed; upstream tests deliberately skipped in the ordinary command |
| Pinned upstream checks | 22 passed: parser registry, --help, 15 scenarios as argv and config, SSH key-path existence, 5 real Bash quoting/config round trips |
| Browser/axe | 12 passed (6 desktop + 6 mobile); zero axe violations on the checked landing/wizard and final-result states |
| Production project Pages path | Passed for /fixture-repo/: asset responses, direct opening, refresh, desktop/mobile overflow, canonical, robots/sitemap and .nojekyll |
| npm audit --audit-level=low | Passed: 0 reported vulnerabilities, including development dependencies |
| Visual inspection | Desktop 1440px and mobile 390px production screenshots inspected; responsive hero, wizard and footer render without horizontal page overflow |

The browser suite covers minimal PostgreSQL, native MySQL template handling, presets, source transitions, existing-repo credential rejection, Horizon/Redis dependencies, custom port conflicts, endpoint consent, clipboard, config download, opt-in storage, Clear data, keyboard focus and English/Russian UI. Axe checks the landing/wizard and final result on both viewport classes. Automated axe checks do not establish complete WCAG conformance or replace assistive-technology testing.

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

Additional checks verify an existing local SSH key file path and literal apostrophes, dollar signs, semicolons, spaces, double quotes and backslashes as single Bash arguments. Upstream config parsing is also exercised. No hook is executed: the CLI exits at dry-run.

## Review and boundaries

Self-review covered emitted flags, preset precedence, stale source-specific values, native DB meaning, reserved/duplicate ports, shell/config quoting, URL credential rejection, pre-parser reserved action values, secret templates, persistence allowlist and deployment permissions. No independent reviewer was used because delegation was not authorized. Container impact: no site Docker images/build inputs; downloaded upstream files were not modified. No full deployment was attempted.

GitHub Actions dependencies are pinned to exact official revision SHAs resolved during implementation. This verifies the references, not a completed remote workflow run.

Remaining release verification:

- Create/connect an independently authorized GitHub repository and run its workflow. The current folder was not a Git checkout. There are no commits, pushes or remote writes from this task.
- Enable Pages, wait for a successful real deployment, then smoke-test the returned HTTPS URL and optional custom domain/DNS. A local project-path check does not establish publication.
- Real Ubuntu provisioning, Docker services, DNS/ACME, remote SSH/Git permissions and native DB connectivity are outside this static generator test scope.
- The HTTPS endpoint adapter is checked by local validation and browser consent tests. No real endpoint or project credentials were contacted/sent.
- Browser coverage uses Chromium with desktop/mobile viewport emulation; Safari, Firefox and screen-reader sessions remain unverified.
- Secrets must be configured privately on the server. Insecure HTTP notification endpoints, browser password inputs and automatic slug generation are intentionally not offered. Only one preset can be selected at a time.

Screenshots and traces are local ignored artifacts in test-results/; HTML browser report is in playwright-report/. The workflow uploads them as a CI artifact. Re-run commands and prerequisites are in README.md.
