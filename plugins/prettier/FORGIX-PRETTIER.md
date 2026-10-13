# Forgix prettier file-only asset

This copies .prettierrc.json and .prettierignore; it does not install
Prettier or add scripts. Check existing formatter configs before copying;
merge preferences manually rather than keeping conflicting configs.

```sh
npm install --save-dev --ignore-scripts --save-exact prettier@3.9.10
npx --no-install prettier --write .
npx --no-install prettier --check .
```

Formatting changes files: review the diff. Built-in Prettier parsers support
JS/TS/JSON/CSS/HTML/Markdown and Vue. Svelte and Python need other tooling;
this plugin does not supply it. Generated artifacts and lockfiles are ignored.

Forgix copies files only. Dependencies and integration remain manual.
