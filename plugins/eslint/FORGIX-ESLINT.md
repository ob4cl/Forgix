# Forgix eslint file-only asset

This copies eslint.forgix.config.mjs only; it does not install dependencies,
modify scripts, or provide TypeScript/JSX/Vue/Svelte parsers. The supplied
flat config checks ordinary JavaScript, MJS and CJS (such as node-api).
Browser and Node globals are allowed; tailor that to your actual runtime.

```sh
npm install --save-dev --ignore-scripts --save-exact eslint@10.12.0 @eslint/js@10.0.1 globals@17.13.0
npx --no-install eslint --config eslint.forgix.config.mjs .
```

Requires Node 22.13+ (ESLint 10). No npx network fetch is needed after install.
Use framework-appropriate parsers/configurations manually for other languages.
The explicit filename avoids replacing an existing eslint.config.*.

Forgix copies files only. Dependencies and integration remain manual.
