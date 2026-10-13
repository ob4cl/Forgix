# Agent usage

Use Node.js 22.13 or newer. Build with `npm ci --ignore-scripts` and `npm run build` before calling `node bin/forgix.js`.

```sh
node bin/forgix.js list --json
node bin/forgix.js create app -t node-api --skip-install -n
node bin/forgix.js create preview -t node-api --dry-run -n
```

Parse stdout as JSON for JSON commands and non-interactive create; read diagnostics from stderr. Check the exit status before interpreting output as success. Set `FORGIX_NON_INTERACTIVE=1` to suppress prompts.

Remote creation requires `--trust-remote`. Hooks require `--allow-hooks`; lifecycle scripts require `--allow-scripts`. These are separate execution permissions. Hooks run shell commands and are not sandboxed. Use an isolated environment for untrusted source material.

`--git` initializes a repository without committing. Git initialization is disabled by default. `--skip-install` skips dependency installation. Failed creation preserves the partial directory for inspection. Do not retry into an existing destination.

Dry runs preview base-template files only; remote templates, layers, and plugins are not supported in preview mode. Plugins only copy files. The scaffold lock records origin and successful hooks; it does not support template upgrades.

See README.md and `create --help` for the supported command surface. Do not use removed generic tooling flags or registry commands.
