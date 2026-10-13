# Built-in starter audit and verification

All ten existing template IDs are retained as minimal usable starters. No new
stacks or supported CLI flags are added. Each has a README, ignore file and
executable tests. Node starters have pinned direct dependencies, npm lockfiles,
explicit ESM and private manifests. Tests are deliberately small, not a claim
of production readiness for the generated application.

| ID | Original gap | Verified starter now |
| --- | --- | --- |
| react-vite | Static HTML, no React source or Vite config | React 19 / Vite 8 focus tracker |
| react-vite-ts | Missing referenced main.tsx, sources/config | Typed React 19 / Vite 8 tracker |
| vue-app | Manifest only | Typed Vue 3 / Vite 8 tracker |
| svelte | Manifest only | Svelte 5 / Vite 8 tracker |
| nextjs | Manifest only, old Next version and absent lint setup | Next 16 App Router / React 19 tracker |
| shadcn-next | No app/components, mismatched legacy config | Next 16, local editable Button, Tailwind 4, aliases |
| node-api | Hard-coded port and no verification/docs | Express 5 JSON API with health and explicit 404 |
| express-ts | Missing referenced source, compiler config | Strict NodeNext Express 5 API |
| python-script | Unstructured greeting only | Dependency-free argparse script with tests |
| fastapi | requirements.txt was YAML, no application | Valid pinned pip requirements, HTTP app/OpenAPI/tests |

No template removal is required by the observed Linux verification results.
The frontend demo state is memory-only; reload resets it. There is no database,
authentication, external service, remote font or claimed deployment integration.
The local shadcn-style Button is intentionally a small editable component,
not an entire component library or automatic shadcn CLI installation.

## Actual integration evidence

On October 13, 2026, a separate checkout of Codex CLI commit
`5eb4c1d8299cc425f5b240a2495735eb75fe06fb` plus these assets generated all ten
starters using `create --non-interactive --skip-install --template <id>`.
`verify-templates.py --install --cli bin/forgix.js` passed for every generated
starter: locked script-suppressed Node installs, builds and tests; isolated
FastAPI wheel install and four in-process HTTP/OpenAPI tests; three Python
script tests and a named command-line greeting. No `--allow-scripts` needed.
Eight Node starter `npm audit --json` checks reported zero known vulnerabilities
at this run; this is not a complete security audit or a future guarantee.

The six actual frontend builds additionally passed all 36 Chromium smoke
cases: 1440/390/320px, both motion settings, increment/reset/keyboard controls,
no overflow, missing/external requests or runtime errors. Production files were
served unchanged using request interception; no application server was started.

Each of the five plugin directories was reviewed. Guidance was moved from
colliding README.md files to distinct FORGIX-*.md files. ESLint, Jest, Prettier
and Tailwind provide real configuration/source assets with explicit manual
installs. Generated-node-api plugin copy/collision checks and tool commands
passed. Docker is scoped to the two Express starters; both images built and
passed four in-container HTTP serialization/dispatch tests as non-root.
Compose configuration also validated. No package/image was published.

See `scripts/README.md` for reproducible commands and evidence output format.
Initial failures from missing sources/README, local Python caches and transient
registry timeouts were diagnosed; the final fresh generated-starter run passed.

## Limits and Codex integration requests

- Template verification ran on Linux x86_64 with Node 26.7.0/npm 11.19.0;
  Docker API checks additionally ran on the Node 22 Alpine image. Python API
  checks used 3.12; the plain script ran on 3.14.7. The full Node 22/24,
  Windows/macOS template matrix has not been run here.
- Browser smoke is Chromium production-client coverage, not live Next server,
  API socket/startup, Firefox/WebKit, screen-reader or live deployment coverage.
- Python runtime direct dependencies are pinned; transitives are not hash-locked.
  Python dependency advisories and container vulnerabilities were not audited.
- Docker uses an upstream moving Node 22 tag, not a digest-pinned release image.
- Plugins are file-copy assets with collision rejection, not automatic dependency,
  script or framework integration. ESLint config covers plain JS/MJS/CJS only;
  Jest includes isolated CommonJS examples, not framework test transforms;
  Tailwind is a standalone CSS recipe, not a Vite/Next integration plugin.
- Codex: update the owned root template descriptions to React 19/Vite 8,
  Svelte 5, Next 16 and Tailwind 4; keep the exact ten-ID supported list above.
- Codex: expose the verification commands from root contributor docs and add
  a generated-template CI job (at least Node 22/24/Linux, then Windows coverage).
- Codex (release blocker): npm archives omit all template `.gitignore` files.
  All ten templates now also provide identical pack-safe `_gitignore` assets.
  Materialize `_gitignore` as `.gitignore` without overwriting existing files;
  omit the fallback from final generated output once materialized. A minimal
  npm packaging probe confirmed that adding an explicit `.gitignore` files
  glob did not include it. Do not claim this is fixed by a manifest glob.
- Packed CLI verification: all ten generated starters passed complete checks
  after the README's explicit manual `_gitignore` copy; the report records
  that manual step per template. Strict generation WITHOUT that step correctly
  failed all ten on missing `.gitignore`. All eight nested npm locks and all
  ten `_gitignore` assets did ship. The packed-generated six frontends also
  passed the 36-case Chromium suite, and packed plugin checks passed.
- Codex (CI integration): the current package-smoke assertion forbids every
  path containing `tests/`, so it fails on intentionally bundled
  `templates/<id>/tests/`. Allow template tests while still excluding root CLI
  tests/scratch projects, then assert locks, fallback/actual ignore files and
  generated template commands in the installed-package test.
- Keep script suppression and plugin collision errors. Python dependencies
  remain manual as documented; do not imply automatic Python installation.

Twelve source-asset/plugin regression tests passed. Direct combined CLI tests
(`node --test tests/cli/*.test.mjs`) passed 16/16. Running the same tests through
`npm test` on this Node 26/npm 11 environment failed the dependency-install
fixture (15/16); targeted/direct invocation passed. This invocation-dependent
CLI issue is reported to Codex; its root cause is not claimed here. The root
format check passed. The root installed-package smoke failed on its stale
blanket tests/ exclusion as described above.

Root engine, manifests, policy files, README and CI are intentionally unchanged
by the template commit. Public readiness still depends on combining/reviewing
both PRs; no repository visibility, main merge or package publication occurred.
