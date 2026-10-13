# Template and plugin verification

These scripts verify bundled assets, not arbitrary remote templates. They do
not publish packages, execute hooks, or start dev/preview/API servers. Use a
new empty workspace path for each run; output and command logs remain there.

## Complete generated-starter check

Prerequisites: Python 3.10+, Node 22.12+ (24 recommended), npm, uv, and network
access for packages/Python wheels. Build the CLI first with the root build
command. Lifecycle scripts remain suppressed; none of the bundled starters
needs `--allow-scripts` on the verified Linux platform.

```sh
npm ci --ignore-scripts
npm run build
python3 scripts/verify-templates.py --work-dir "$HOME/forgix-template-check" --install --cli bin/forgix.js
python3 -m unittest discover -s tests/templates -v
python3 scripts/verify-plugins.py --work-dir "$HOME/forgix-plugin-check" --cli bin/forgix.js
```

`verify-templates.py` checks the complete ten-directory inventory and reports
each result separately in `results.json`. It generates through the real CLI,
checks required files and commands, installs using `npm ci --ignore-scripts`,
builds and runs each starter's tests, and checks built entry points. FastAPI
uses an isolated Python 3.12 venv and wheel-only requirements installation;
HTTP tests run in-process. The plain Python script needs no packages.

Omitting `--install` checks structure only. Omitting `--cli` copies/substitutes
bundled assets directly: that is deliberately not an engine integration claim.
Use `--templates` followed by exact template IDs for targeted runs.
If a registry connection fails, the run fails honestly; retry in a new workspace.
An optional `npm_config_cache` environment variable can select an existing
cache without sharing npm configuration or credentials with generated homes.

Packed CLI caveat: npm excludes `.gitignore`; templates provide `_gitignore`
as a pack-safe fallback. Until Codex integrates automatic materialization,
strict packed-CLI verification fails the ignore-file requirement. Use
`--manual-ignore-fallback` only to test the explicitly documented manual copy
step. Every result records `manual_setup`; this is not an automatic engine
pass. The default verifier never silently repairs missing generated files.

`verify-plugins.py` generates node-api, applies all five plugins, proves README
preservation and collision rejection without changed files, then explicitly
installs the dependencies listed in plugin guidance. It tests ESLint including
violation detection, Jest examples/coverage, Prettier, Tailwind CSS and the API.
Copying plugins alone does not perform those installs or integrate a framework.
Docker validation is separate; do not infer image/runtime checks from this script.

## Optional real-browser smoke check (no server)

Use an installed Playwright module and compatible Chromium executable. No
root manifest dependency is added by these scripts. If needed, install
Playwright in a separate verification workspace using lifecycle-suppressed
installation and deliberately install its Chromium browser. Then run:

```sh
node scripts/smoke-template-ui.mjs \
  --projects "$HOME/forgix-template-check" \
  --output "$HOME/forgix-ui-check" \
  --playwright /path/to/playwright/index.mjs \
  --chromium /path/to/chrome
```

The six frontend production builds are served unchanged through browser
request interception at a synthetic HTTPS origin, not a listening server.
The suite checks initial state, two clicks, reset and keyboard activation at
1440/390/320px with normal/reduced motion, no horizontal overflow, no external
or missing requests, and no page errors. Next checks use prerendered HTML and
production chunks; they are not a test of a live Next server or dynamic routes.
`results.json` and screenshots are written outside production output.
This is Chromium-only coverage, not a WCAG audit or real-device certification.

## Docker scope

The Docker plugin is supported only for node-api and express-ts. On a generated
starter after `forgix add docker`, run `docker build -t starter-api .` and
`docker run --rm --network none --entrypoint node starter-api --test tests/http.test.mjs`.
These tests exercise the compiled API as non-root without opening a port.
`docker compose -f compose.yaml config --quiet` validates the Compose definition.
Publication, network listening, image vulnerability scanning and live deployment
are not part of this verification.
