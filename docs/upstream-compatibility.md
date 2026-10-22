# LaraShip compatibility contract

Source verified on 2026-10-21 and rechecked on 2026-10-22 against [a60817564e2e9efe018bbcaee9f8ba1173464ff6](https://github.com/shellharbor/laraship/tree/a60817564e2e9efe018bbcaee9f8ba1173464ff6), `VERSION=1.2.2`. The default branch still pointed to this revision. This is a compatibility pin, not an automatic update channel. Published-image verification is recorded separately below.

Audit inputs: `deploy-laravel.sh` (`parse_args`, validation, config parser, `main`, `print_dry_run`), `versions.env`, all five `modules/*.sh`, all three `presets/*.conf`, README Arguments/Modules/Presets/Existing application/Security/Known limitations, `examples/01-*` through `15-*`, `tests/validation.bats`, and `tests/presets.bats`. Parser and tests take precedence over prose and examples.

The complete typed flag registry is [`CLI_OPTION_MAP`](../src/data/upstream.ts). It includes type, accepted values, default, UI availability, dependencies, description, and a revision-pinned source link for every long option, including intentionally omitted secret and compatibility flags. Generate the accompanying table with `node scripts/write-cli-reference.mjs` after intentional registry updates. Short aliases are `-h` (`--help`) and `-V` (`--version`).

## Verified behavior and deliberate restrictions

| User question | Contract |
| --- | --- |
| New or existing application? | New uses Laravel ^13.0 by default; wizard also offers ^12.0. Existing uses HTTPS/SSH/SCP repo, optional branch and SSH server key path. Existing cannot install Filament/Horizon or set Laravel version. |
| Which presets? | Multiple compatible presets. `admin-panel`: Filament, Redis, queue. `api`: Horizon, automatically Redis, PHP 16M. `staging`: Basic Auth, Redis. admin-panel+staging and api+staging are supported; admin-panel+api is blocked because Queue/Horizon conflict. Modules/auth are additive; explicit upload overrides win. Preset-required features stay locked until the relevant preset is unchecked. |
| What address? | Explicit slug required; format matches CLI, reserved nginxproxy rejected case-insensitively. CLI domain validation only checks allowed characters; wizard deliberately requires a valid multi-label DNS hostname and rejects IP literals. Auto-slug is omitted because CLI prepends it to the domain. |
| Where is the database? | PostgreSQL 17 or MySQL 8.4, container or already running on the same server. Native is not remote/cloud. Native port sets Laravel DB_PORT; database provisioning still uses the host's normal local client connection. |
| Custom database identity? | Names/users: `[A-Za-z0-9_][A-Za-z0-9_-]*`. PostgreSQL both max 63; MySQL name 64/user 32. Container MySQL app user cannot be `root` (native CLI permits it). |
| What about passwords? | No password inputs, persistence, telemetry, or remote generation. LaraShip generates them. Native MySQL requires a marked `<MYSQL_ROOT_PASSWORD>` template plus an optional server-local hidden-input snippet. Even this snippet leaves the secret visible to process inspection; CLI cannot avoid that. |
| Which ports? | 1–65535, optional. Project ports 80/443 reserved for shared proxy. Wizard rejects duplicates including explicitly chosen native DB port (stricter than CLI). All project bindings are loopback by default. Redis port remains relevant without its module because Redis container is in the base stack. |
| Backups? | `backup` creates DB dumps at startup and daily, retained 1–3650 days (default 7). `--create-backup` is a separate ZIP without database volume contents or certificates. |
| Custom PHP upload? | CLI syntax `[0-9]+[KMGkmg]?` (including 0). Omitted values preserve PHP defaults 2M/8M, or preset 16M. |
| Notifications? | HTTPS endpoint only, explicit acknowledgement that the server sends generated credentials. No insecure HTTP escape hatch. Browser never contacts it. |
| Run a hook? | Expert opt-in, one line, acknowledgement of arbitrary PHP-container code execution and repetition during updates. Applies to New and Existing. |
| Export config? | Non-secret KEY=VALUE with matching outer quotes; never shell-source. Preset → config → CLI; true booleans/modules add. Protect local file using chmod 600. Native MySQL export contains a clearly marked template, not a working secret. |
| How is LaraShip installed/run? | Visible guide offers full pinned source checkout with Bash, or the digest-pinned Docker CLI image. The same validated CLI options/config apply to both. Docker deploy/management need the Linux server socket, host network and identical paths; native DB provisioning always uses Bash. |

## Source discrepancies resolved

- README says explicit ports are not checked for occupancy; current runtime checks availability before deployment. Browser promises neither occupancy nor infrastructure validation.
- Examples still mention MySQL 8.0 and older password limitations. `versions.env` selects MySQL 8.4, and actual credential validation/encoding governs supported characters.
- CLI only requires nonempty email strings; wizard uses an email format check.
- CLI accepts HTTP, git:// and file:// repositories; the public wizard offers HTTPS and SSH only and rejects credentials, query strings, fragments, whitespace and controls.
- Redis module wires Laravel to an already present Redis service; it is not the switch that creates that container.
- DH parameters affect project nginx, not the shared TLS proxy. Horizon requires a production authorization gate.
- Upstream pre-parses `--config`, `--preset`, `--dry-run` and its early exit actions without respecting argument value positions. The wizard rejects those exact strings as free-text values; quoting alone cannot fix this parser behavior.

## Multiple-preset contract

Source `main` handles every `--preset NAME` in order; `read_config_file` also loads every `PRESET=NAME` line. The wizard emits repeated flags/keys rather than a comma-separated preset value. Selection is a deduplicated array in registry order: admin-panel, api, staging. Current compatible combinations have no competing scalar defaults; the effective merge uses the last nonempty preset upload value in registry order, then the user's explicit override. Modules and enabled booleans remain additive.

`presetBlock` considers both selected presets and manual modules. Queue worker and Horizon cannot coexist; new-only presets are unavailable for existing repositories. Selected checkboxes stay removable. `togglePreset` guards selection even when called outside the control, and `validate` independently rejects conflicting/source-incompatible preset sets at step 0 before generating Bash or Docker commands. Unknown names are rejected. Switching source to Existing retains staging and removes only new-only presets/modules.

Preferences retain the v1 storage key. A valid legacy single `preset` becomes an array; a new array takes precedence, including an empty array. Restoration filters unknown/duplicate names, then accepts a compatible subset in registry order after manual services/source are restored. A malformed admin-panel/api combination keeps the first allowed preset, with staging retained if present. No new identity fields enter persistence. Clearing presets does not erase separately chosen services.

## Installation and verification boundary

The installation guide precedes the wizard and is also accessible in the result. It explains that LaraShip is a server CLI, the site generates commands locally, and application services use Docker with either runner. The runner preference lives in App memory, outside deployment settings/storage. Both English and Russian are supported.

**Bash:** clone the entire official repository into a previously absent `/opt/laraship`, then check out the pinned commit. No guessed release URL or `curl | bash` is used. Review the toolkit before running it as root. Required: Ubuntu 20.04+, sudo, Git, Python 3, curl, ss, flock, pgrep, timeout; Docker Compose V2 if Docker is already installed; reachable DNS/80/443 and package registries. The script can install Docker when absent. The guide includes package and full-checkout commands.

**Docker:** verified [Docker Hub image](https://hub.docker.com/r/shellharbor/laraship) `shellharbor/laraship:1.2.2`, index digest `sha256:ddc03c1636a48e6d4e290cc5ba32f502995314335603139db16d938d63a3ab8b`, manifest `sha256:7dad67be71ac5eda32e5e554cb869b4dac0e959e5c9836fca4b3e20852ae1f63`, platform `linux/amd64`. Docker Hub API metadata was checked on 2026-10-22. OCI source revision is `39f150b133744752433f02c30395767d541f133a`, version 1.2.2, not the website's source-pin revision. SHA256 comparisons verified deployment/version files, list/update/backup scripts, three lib helpers, all five modules, all three presets, preflight and entrypoint against the source pin. This establishes the audited Compose CLI contracts; it is not an audit of every image layer or Kubernetes backend.

The host needs an installed/running Docker Engine on a supported Ubuntu version; the guide links [Docker's official repository installation](https://docs.docker.com/engine/install/ubuntu/) and gives 24.04 LTS as an example. Docker's current supported release list is narrower than LaraShip's 20.04 minimum. The CLI image contains Docker client and Compose plugin. Source checkout is optional. Image pull, version, help and a sample dry-run appear before deployment-directory preparation.

The generated deployment command follows the pinned [container contract](https://github.com/shellharbor/laraship/blob/a60817564e2e9efe018bbcaee9f8ba1173464ff6/docs/CONTAINERS.md): host networking and writable same-path binds for `/var/run/docker.sock`, `/var/www`, `/run/lock/laraship` and `/var/backups/laraship`. The guide includes upstream directory preparation and explains socket administrative access and trusted images. No privileged flag, custom hostname, remote daemon or Docker Desktop production path translation is offered. A config/SSH key is read-only at the same absolute path. Docker's CSV mount grammar and POSIX shell quoting are handled separately.

Informational containers need no host socket/network/deployment directories; an optional deploy-key file still needs its read-only mount because the CLI checks existence during dry-run. Native DB provisioning is rejected by the container adapter outside dry-run. Results explicitly resolve native selections to Bash, disable Docker with an explanation and retain the user's preferred runner if they return to a container database. A direct invalid Docker/native generation call also throws. Management uses the image's `list`, `update` and `backup` aliases with server mounts.

One-time ZIP location: Bash `/tmp`; Docker `/var/backups/laraship` via image `LARASHIP_ARCHIVE_DIR`. The CLI's dry-run prose still says `/tmp` in container mode; runtime archive code and Dockerfile determine the effective location. The site shows the correct runner-dependent directory. Database dumps remain separate.

No application deployment or Docker image build belongs to this static website's runtime. The downloaded source is an ignored read-only fixture. No upstream build inputs were changed, so no image rebuild is needed. Optional Docker tests use the already cached immutable image with no network, server socket or writable deployment mounts. They check informational entrypoints, synthetic read-only config/key fixtures, CLI dry-runs and audited file hashes. Full provisioning on a Linux server, server mounts/preflight in production, Git/DNS/ACME and real DB operations remain unverified.

When updating source or image pins: re-audit these files plus Dockerfile, docker/entrypoint.sh, docker-preflight.py and docs/CONTAINERS.md. Verify registry platforms/digest, OCI labels and affected image/source contracts. Update registry/constraints/validation as needed, regenerate the CLI reference after registry changes, then run unit, upstream differential, explicit Docker integration, UI/accessibility and Pages-base checks. Never silently follow upstream main or a mutable tag in production commands.
