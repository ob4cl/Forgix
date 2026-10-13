import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.next/**', 'coverage/**', 'tooling/**'] },
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    languageOptions: { ecmaVersion: 'latest', globals: { ...globals.browser, ...globals.node } },
    rules: { ...js.configs.recommended.rules },
  },
];
