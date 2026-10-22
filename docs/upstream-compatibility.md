# LaraShip compatibility contract

Verified on 2026-10-21 against [a60817564e2e9efe018bbcaee9f8ba1173464ff6](https://github.com/shellharbor/laraship/tree/a60817564e2e9efe018bbcaee9f8ba1173464ff6), `VERSION=1.2.2`. The default branch still pointed to this revision during implementation. This is a compatibility pin, not an automatic update channel or a claim that release assets exist.

Audit inputs: `deploy-laravel.sh` (`parse_args`, validation, config parser, `main`, `print_dry_run`), `versions.env`, all five `modules/*.sh`, all three `presets/*.conf`, README Arguments/Modules/Presets/Existing application/Security/Known limitations, `examples/01-*` through `15-*`, `tests/validation.bats`, and `tests/presets.bats`. Parser and tests take precedence over prose and examples.

The complete typed flag registry is [`CLI_OPTION_MAP`](../src/data/upstream.ts). It includes type, accepted values, default, UI availability, dependencies, description, and a revision-pinned source link for every long option, including intentionally omitted secret and compatibility flags. Generate the accompanying table with `node scripts/write-cli-reference.mjs` after intentional registry updates. Short aliases are `-h` (`--help`) and `-V` (`--version`).

## Verified behavior and deliberate restrictions

| User question | Contract |
| --- | --- |
| New or existing application? | New uses Laravel ^13.0 by default; wizard also offers ^12.0. Existing uses HTTPS/SSH/SCP repo, optional branch and SSH server key path. Existing cannot install Filament/Horizon or set Laravel version. |
| Which preset? | One preset supported. `admin-panel`: Filament, Redis, queue. `api`: Horizon, automatically Redis, PHP 16M. `staging`: Basic Auth, Redis. Modules and true booleans are additive. Preset selections remain locked; explicit upload overrides are allowed. |
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

## Source discrepancies resolved

- README says explicit ports are not checked for occupancy; current runtime checks availability before deployment. Browser promises neither occupancy nor infrastructure validation.
- Examples still mention MySQL 8.0 and older password limitations. `versions.env` selects MySQL 8.4, and actual credential validation/encoding governs supported characters.
- CLI only requires nonempty email strings; wizard uses an email format check.
- CLI accepts HTTP, git:// and file:// repositories; the public wizard offers HTTPS and SSH only and rejects credentials, query strings, fragments, whitespace and controls.
- Redis module wires Laravel to an already present Redis service; it is not the switch that creates that container.
- DH parameters affect project nginx, not the shared TLS proxy. Horizon requires a production authorization gate.
- Upstream pre-parses `--config`, `--preset`, `--dry-run` and its early exit actions without respecting argument value positions. The wizard rejects those exact strings as free-text values; quoting alone cannot fix this parser behavior.

## Installation and verification boundary

The wizard recommends cloning the entire official repository into a previously absent `/opt/laraship`, then checking out the pinned commit. It does not use a guessed release tag/download URL or `curl | bash`. Review the toolkit before running it as root. Required: Ubuntu 20.04+, sudo, Git, Python 3, curl, ss, flock, pgrep, timeout; Docker Compose V2 if Docker is already installed; reachable DNS/80/443 and upstream package registries. The installer can install Docker when absent.

No application deployment or Docker image build belongs to this static website's runtime. The downloaded upstream tree is an ignored read-only test fixture, not part of the site. No upstream build inputs were changed. Only upstream `--help` and `--dry-run` are executed; full deployment on a server is outside this test scope.

When updating the pin: re-audit these files, update registry/constraints/validation, regenerate the reference, then run unit, upstream differential, UI, accessibility, and Pages-base checks. Never silently follow upstream main in production commands.
