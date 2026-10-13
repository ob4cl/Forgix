# {{projectName}}

If a packed Forgix CLI omitted `.gitignore`, copy the bundled `_gitignore`
to `.gitignore` before committing your project (`cp _gitignore .gitignore`,
or `Copy-Item _gitignore .gitignore` in PowerShell). The pack-safe fallback
is provided because npm excludes `.gitignore` from archives; automatic
materialization needs the pending CLI integration. Source-checkout generation
already includes `.gitignore`. Remove `_gitignore` after copying if desired.

Vue 3 + Vite 8 + TypeScript. A small focus tracker with complete-task and reset controls,
responsive local styles, and accessible live status. No remote fonts or assets.

## Requirements and commands

Use Node.js 22.12+ (Node 24 LTS recommended) and npm. Dependencies are pinned;
keep `package-lock.json` when updating them.

```sh
npm ci --ignore-scripts
npm run build
npm test
```

`npm test` checks the production build assets (build first), dependency pins
and absence of install hooks. It does not launch a server or test a browser.
`npm run typecheck` performs framework-aware static checking.
`npm run dev` starts local development when you choose to run it.
`npm run preview` serves the built Vite application.

## Make it yours

Start in `src/App.vue`. Edit `index.html` for metadata and `src/style.css` for styling.
The tracker is deliberately in-memory; reload resets it. No backend, persistence,
unit test runner, lint command, authentication or deployment integration is implied.

Production output: `dist/` (HTML, CSS and JavaScript assets).
Build tests are a small regression guard, not end-to-end interaction coverage.
