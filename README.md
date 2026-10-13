# Forgix

A TypeScript CLI for creating projects from reusable local templates or trusted GitHub repositories.

Forgix copies a template, replaces known variables, optionally installs Node dependencies, and records the template origin in `.scaffold-lock.yaml`. It is an early-stage portfolio project: the CLI has regression coverage; the bundled starter collection is being repaired and verified separately.

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

The bundled templates and plugins need their separate verification pass before they should be described as production-ready. Run `list` to inspect available names. The `check` command is a heuristic checklist, not a security audit: its secret-keyword check examines package.json only, and its ignore-file checks do not evaluate Git's full ignore semantics. Dependencies and templates still require review. Python dependencies are not installed automatically.

## Development

```sh
npm ci --ignore-scripts
npm test
npm run test:package
npm run format:check
```

Tests exercise output parsing, destination preservation, name/path boundaries, hook behavior, variable replacement, and template provenance. CI runs CLI checks on Windows and Linux with Node 22 and 24. See [CONTRIBUTING.md](CONTRIBUTING.md), [SECURITY.md](SECURITY.md), and [AGENT.md](AGENT.md).

## License

MIT. See [LICENSE](LICENSE).
