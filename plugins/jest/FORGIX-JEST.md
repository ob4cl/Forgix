# Forgix jest file-only asset

This copies a separately named CommonJS Jest config and a small, executable
pure-function example under tooling/jest/. It does not install Jest, add a
package script, convert ESM, or configure framework/TypeScript transforms.
The example is not application test coverage. Native starter tests remain
separate and are not picked up by this Jest configuration.

```sh
npm install --save-dev --ignore-scripts --save-exact jest@30.5.2
npx --no-install jest --config jest.forgix.config.cjs --runInBand --coverage
```

The .cjs files work in ESM projects. Replace/extend tooling/jest/slugify.cjs
and its tests with your own plain CommonJS logic. ESM, React, TypeScript,
Vue and Svelte testing requires deliberate additional integration.

Forgix copies files only. Dependencies and integration remain manual.
