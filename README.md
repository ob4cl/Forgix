# Forgix

**Reusable templates. Repeatable project setup.**

[![CI](https://github.com/ob4cl/Forgix/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ob4cl/Forgix/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%E2%89%A522.13-417e38?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Forgix is a TypeScript CLI that creates projects from built-in starters, your own local templates, or trusted GitHub repositories. It replaces template variables, optionally installs dependencies, and records where the project came from.

- **Ten working starters** for frontend, Node API, and Python projects.
- **Your own defaults** through linked templates and saved configuration.
- **Predictable automation** with JSON output, preview mode, and nonzero failure exits.
- **Explicit execution controls** for remote trust, hooks, and dependency scripts.

## Quick start

Requires **Node.js 22.13+**, npm, and Git to clone this repository. Install from a checkout; these instructions do not assume an npm registry release.

```sh
git clone https://github.com/ob4cl/Forgix.git
cd Forgix
npm ci --ignore-scripts
npm pack
npm install -g ./forgix-1.1.0.tgz --ignore-scripts
```

Create a React + TypeScript project outside the Forgix checkout:

```sh
cd ..
forgix create my-app --template react-vite-ts --skip-install -n
cd my-app
npm ci --ignore-scripts
npm run build
npm test
npm run dev
```

`npm pack` builds the CLI before creating the tarball. To use it without a global installation, run `npm run build` and invoke `node bin/forgix.js` from the checkout. For a private checkout, Git uses your configured credentials; do not embed a token in the clone URL.

## Choose a starter

| Template        | Stack                   | Starting point                      |
| --------------- | ----------------------- | ----------------------------------- |
| `react-vite`    | React 19 + Vite 8       | JavaScript focus tracker            |
| `react-vite-ts` | React 19 + Vite 8       | TypeScript focus tracker            |
| `vue-app`       | Vue 3 + Vite 8          | Typed Vue components                |
| `svelte`        | Svelte 5 + Vite 8       | Interactive Svelte app              |
| `nextjs`        | Next.js 16 + React 19   | App Router application              |
| `shadcn-next`   | Next.js 16 + Tailwind 4 | Local editable shadcn-style Button  |
| `node-api`      | Express 5               | JSON API with health endpoint       |
| `express-ts`    | Express 5 + TypeScript  | Strict NodeNext API                 |
| `python-script` | Python                  | Dependency-free argparse script     |
| `fastapi`       | FastAPI                 | HTTP application with OpenAPI tests |

Each starter includes its own README and tests. Node starters ship npm lockfiles and pinned direct dependencies. Python dependency installation is manual; follow the generated README.

Choose TypeScript through a TypeScript template. Generic `--ts`, `--ci`, `--docker`, and similar tooling shortcuts are no longer supported; the stack is defined by the template.

## Make a template your own

```sh
forgix link my-service ./path/to/template
forgix create preview -t my-service --dry-run -n
forgix create my-api -t my-service --skip-install -n
```

Use `{{projectName}}`, `{{author}}`, and `{{license}}` in text files. Unknown placeholders remain intact. A `template.yaml` manifest can supply `name` and `version`; `.scaffold-lock.yaml` records the origin, generated file names, variables, and completed hooks.

Git metadata, `node_modules`, and template metadata are excluded from generated projects. Pack-safe `_gitignore` assets become `.gitignore` automatically; matching duplicates are removed and conflicting contents fail without overwriting the existing ignore file. Symbolic links are unsupported.

## Command reference

| Command                       | Purpose                                             |
| ----------------------------- | --------------------------------------------------- |
| `create [name] -t <template>` | Generate a project                                  |
| `list --json`                 | List starters, plugins, and linked templates        |
| `link <name> [path]`          | Register a local template                           |
| `add <plugin>`                | Copy plugin assets into the current project         |
| `config --json`               | Show saved defaults                                 |
| `config --set key=value`      | Update defaults                                     |
| `doctor --json`               | Check development tools without changing the system |
| `check . --json`              | Run a limited project hygiene checklist             |

Run `forgix create --help` for all creation options, including package manager, author/license variables, plugins, layers, and execution controls.

```sh
# Preview a local base template without creating the destination
forgix create my-api -t node-api --dry-run -n

# Inspect and trust the repository before using it
forgix create my-api -t github:owner/repository --trust-remote --skip-install -n

# Optional file-only Docker assets for an Express starter
cd my-api
forgix add docker
```

Plugins available: `docker`, `eslint`, `jest`, `prettier`, and `tailwind`. They copy assets and distinct setup guides; dependencies and framework integration remain manual. File collisions fail. Docker assets support the two Express starters only.

## Execution and automation

| Control                    | Default behavior                                       |
| -------------------------- | ------------------------------------------------------ |
| `--git`                    | Opt-in repository initialization; no initial commit    |
| `--allow-scripts`          | Dependency lifecycle scripts suppressed unless enabled |
| `--allow-hooks`            | Template hooks skipped unless enabled                  |
| `--trust-remote`           | Required for remote templates in non-interactive mode  |
| `--skip-install`           | Generate files without installing dependencies         |
| `-n` / `--non-interactive` | No prompts; JSON creation result on stdout             |

JSON commands write one document to stdout; diagnostics go to stderr in machine mode. `FORGIX_NON_INTERACTIVE=1` enables non-interactive mode, and creation also detects non-TTY output. Existing destinations are never overwritten. Failures return a nonzero exit status and preserve partial output for inspection.

Hooks execute reviewed shell commands through `sh`; they are not sandboxed. Variables arrive as `FORGIX_PROJECT_NAME`, `FORGIX_AUTHOR`, and `FORGIX_LICENSE`, rather than being inserted into shell source. Blocking hook failures fail creation, only successful hooks are recorded, and background hooks are unsupported.

Preview mode supports local base templates. Remote, layer, and plugin previews fail explicitly. Composition supports a base directory and named file overlays with `overwrite` or `skip` policies; merge mode and template upgrades are not implemented.

## Development and verification

```sh
npm ci --ignore-scripts
npm test
npm run format:check
npm run test:package
```

| CI coverage                                             | Platforms                                   |
| ------------------------------------------------------- | ------------------------------------------- |
| CLI regressions and installed-package smoke checks      | Windows + Linux; Node 22, 24, 26            |
| All ten packed starters: generate, install, build, test | Linux; Node 22, 24; Python 3.12 for FastAPI |
| Template/plugin assets and plugin-tool integration      | Linux; plugin tools on Node 24              |

The strict packed-starter check needs Python 3.10+, uv, Node, npm, and package-network access:

```sh
python -m unittest discover -s tests/templates -v
python scripts/verify-templates.py --work-dir ./work/starter-check --install --cli bin/forgix.js
python scripts/verify-plugins.py --work-dir ./work/plugin-check --cli bin/forgix.js
FORGIX_VERIFY_TEMPLATES=1 npm run test:package
```

Build the CLI first and use fresh, nonexistent work directories. On PowerShell, set `$env:FORGIX_VERIFY_TEMPLATES='1'` before the last command.

See [verification methods](scripts/README.md), [starter verification evidence](templates/VERIFICATION.md), [contributing](CONTRIBUTING.md), and [agent usage](AGENT.md).

## Scope

These are minimal starter applications. Frontend state is in memory; persistence, authentication, and deployment belong to the application owner. The hygiene checker is heuristic: it checks secret keywords in `package.json`, not all source code, and does not evaluate Git's full ignore semantics. It is not a security audit.

Current CI does not establish full Windows/macOS starter compatibility, alternative-browser coverage, or live deployment readiness. See the verification documentation for the distinction between automated checks and earlier browser/container evidence. Review trusted templates and dependencies before enabling their scripts or hooks. Read [SECURITY.md](SECURITY.md) for reporting guidance.

## License

[MIT](LICENSE).
