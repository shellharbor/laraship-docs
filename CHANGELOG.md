# Changelog

## Unreleased

- Added a visible LaraShip installation guide before the wizard: Ubuntu prerequisites, complete Bash toolkit checkout, official Docker Engine setup link, pinned CLI image pull/inspection and deployment-directory preparation, in English and Russian.
- Added Bash/Docker CLI runner selection with matching deploy, dry-run, config and management commands. Docker uses the verified immutable 1.2.2 image, server mounts and readonly config/key binds; native databases explicitly require Bash. Corrected the Docker project ZIP location.
- Added Docker command contract and opt-in published-image tests plus desktop/mobile installation, runner, native fallback, export and accessibility checks. Browser screenshots use CSS pixel scale for the longer guide.
- Added a responsive static LaraShip configurator with English/Russian UI, six conditional steps, Basic/Advanced modes, accessible navigation and a deployment summary.
- Added new/existing application support, PostgreSQL/MySQL Docker/native variants, additive presets, module dependencies, HTTPS, backups and advanced settings.
- Added strict effective-configuration validation, deterministic argv and POSIX quoting, deploy/dry-run commands, local config download and explicit native MySQL secret templates. No passwords are collected; optional storage uses a preference allowlist.
- Audited and pinned LaraShip 1.2.2 at a60817564e2e9efe018bbcaee9f8ba1173464ff6; documented the complete CLI registry and source discrepancies.
- Added unit/upstream differential/browser/accessibility/Pages-base tests and a GitHub Actions Pages workflow with conditional custom-domain metadata.
- Documented development, release steps, remaining verification boundaries, project decisions and continuity pointers. Upstream LaraShip application files remain unchanged.
- Published the initial site source to shellharbor/laraship-docs and enabled GitHub Actions Pages with HTTPS and main-branch deployment. The first remote check job passed; the live site and complete wizard journey were verified on desktop and mobile at shellharbor.github.io/laraship-docs/.
