# Forgix

A TypeScript CLI for creating projects from reusable local templates or trusted GitHub repositories.

Forgix copies a template, replaces known variables, optionally installs Node dependencies, and records the template origin in `.scaffold-lock.yaml`. It is an early-stage portfolio project with CLI regression coverage and minimal, tested starter applications.

## Run from source

Requires Node.js 22.13 or newer and npm. Git is optional for local templates and required for remote repositories or `--git`.

```sh
git clone https://github.com/ob4cl/Forgix.git
cd Forgix
npm ci --ignore-scripts
npm test
node bin/forgix.js list --json
node bin/forgix.js create my-api --template node-api --skip-install -n
```

Install a local package if you want the `forgix` command:

```sh
npm pack
npm install -g ./forgix-1.1.0.tgz
forgix --help
```

These instructions use the repository's package name. Registry publication is not required and no published package is assumed.

## Reuse your own template

```sh
forgix link my-service ./path/to/template
forgix create my-service-app -t my-service --dry-run -n
forgix create my-service-app -t my-service --skip-install -n
```

Known placeholders in text files: `{{projectName}}`, `{{author}}`, `{{license}}`. Unknown placeholders are preserved. Git metadata and node_modules are excluded from copies; symbolic links are rejected. Template metadata files are not copied into generated applications.

Templates may include `template.yaml` with `name` and `version`. The scaffold lock records that version and generated file names; it does not implement upgrades or verify file integrity.

## Built-in starters

| Template        | Stack                                                        |
| --------------- | ------------------------------------------------------------ |
| `react-vite`    | React 19 + Vite 8, JavaScript                                |
| `react-vite-ts` | React 19 + Vite 8, TypeScript                                |
| `vue-app`       | Vue 3 + Vite 8, typed components                             |
| `svelte`        | Svelte 5 + Vite 8                                            |
| `nextjs`        | Next.js 16 App Router + React 19                             |
| `shadcn-next`   | Next.js 16 + Tailwind 4 + local editable shadcn-style Button |
| `node-api`      | Express 5 JSON API                                           |
| `express-ts`    | Express 5 + strict NodeNext TypeScript                       |
| `python-script` | Dependency-free argparse script                              |
| `fastapi`       | FastAPI application with HTTP/OpenAPI tests                  |

Each starter includes its own README and tests. Node starters ship npm lockfiles and pinned direct dependencies. The CLI automatically materializes pack-safe `_gitignore` assets as `.gitignore`, preserving matching source ignore files and rejecting conflicts. The fallback name is removed from generated output.

Plugin files provide explicit setup guidance and scoped assets. Docker supports the two Express starters; other plugins require manual dependency and framework integration. A copied plugin does not establish application test coverage.

## Commands

| Command                                          | Behavior                                                                 |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| `create [name] -t <template>`                    | Copy a built-in or linked template                                       |
| `create app -t github:owner/repo --trust-remote` | Clone a trusted repository; Git credentials come from your own Git setup |
| `list --json`                                    | List bundled templates, plugin directories and local links               |
| `link <name> [path]`                             | Register a local directory                                               |
| `add <plugin>`                                   | Copy plugin files into the current directory; collisions fail            |
| `config --json`                                  | Show defaults                                                            |
| `config --set key=value`                         | Change defaults                                                          |
| `doctor --json`                                  | Report available tools without installing anything                       |
| `check . --json`                                 | Run a limited project hygiene checklist                                  |

`create` options: `--skip-install`, `--pm npm|yarn|pnpm`, `--author`, `--license`, `--git`, `--open`, `--plugins <names...>`, `--dry-run`, `--layers <names...>`, `--trust-remote`, `--allow-hooks`, `--allow-scripts`, and `-n`/`--non-interactive`.

Choose a template that already contains the desired framework and tooling. The former generic TypeScript, CSS, Docker, lint, test, and CI shortcut flags have been removed because they did not reliably integrate those tools. Plugins copy files; they do not automatically modify dependencies. Registry commands are excluded from the supported CLI until their creation path is implemented.

## Execution and output

- Git initialization is opt-in and does not create a commit or alter your Git identity.
- Dependency installation suppresses lifecycle scripts unless `--allow-scripts` is provided. Some dependencies require scripts; review them before enabling this option.
- Hooks are skipped unless `--allow-hooks` is provided. Hooks execute reviewed shell commands through `sh`, which must be installed. This is not a sandbox.
- Hook variables are environment values: `FORGIX_PROJECT_NAME`, `FORGIX_AUTHOR`, and `FORGIX_LICENSE`. They are not interpolated into shell source.
- Blocking hook failures fail creation. Only successful hooks are recorded. Background hooks are unsupported.
- Remote sources require explicit trust in non-interactive mode. Authentication is delegated to Git; never embed tokens in template URLs.
- A base-template dry run does not create the destination or run installation/hooks. Remote previews and previews with layers/plugins are explicitly unsupported.
- JSON commands write one JSON document to stdout. Diagnostics go to stderr in machine mode. Non-TTY create automatically uses non-interactive mode; `FORGIX_NON_INTERACTIVE=1` also enables it.
- Failures leave partial output available for inspection and return a nonzero exit status. Existing project directories are never overwritten.

Composition is a small file overlay feature: `composition.yaml` specifies a `base` directory and named `layers` with `path` and `conflicts: overwrite|skip`. Paths must remain inside the template. Merge mode is unsupported.

## Limitations

The starters are deliberately small applications, not production systems. Frontend state is in memory; authentication, persistence and deployment are left to the application owner. Python dependency installation is manual. The `check` command is a heuristic checklist, not a security audit: its secret-keyword check examines package.json only, and its ignore-file checks do not evaluate Git's full ignore semantics. Dependencies and templates still require review. Python dependencies are not installed automatically.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run test:package
npm run format:check
```

Tests exercise output parsing, destination preservation, name/path boundaries, hook behavior, variable replacement, and template provenance. CI runs CLI checks on Windows and Linux with Node 22, 24 and 26, and verifies all ten installed-package starters on Linux with Node 22 and 24. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [AGENT.md](AGENT.md).

## License

MIT. See [LICENSE](LICENSE).

## Verify generated starters

The complete check needs Python 3.10+, uv, Node and npm. Python 3.12 is used for the isolated FastAPI environment.

```sh
python -m unittest discover -s tests/templates -v
python scripts/verify-templates.py --work-dir ./work/starter-check --install --cli bin/forgix.js
python scripts/verify-plugins.py --work-dir ./work/plugin-check --cli bin/forgix.js
FORGIX_VERIFY_TEMPLATES=1 npm run test:package
```

Choose fresh, nonexistent work directories. The last command checks all ten starters through the installed tarball, without manual ignore-file repair. On PowerShell, set `$env:FORGIX_VERIFY_TEMPLATES='1'` before the npm command. See [scripts/README.md](scripts/README.md) and [templates/VERIFICATION.md](templates/VERIFICATION.md) for methods and platform limits. Historical verification evidence is distinguished from current CI results.
