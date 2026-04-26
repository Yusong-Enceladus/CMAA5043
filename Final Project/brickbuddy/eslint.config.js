import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Vite config + functions/* run on Node, not in the browser. Give them
  // node globals so `Buffer` / `process` / `fetch` aren't flagged.
  {
    files: ['vite.config.js', 'functions/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  // App.jsx and BuildContext.jsx legitimately export both a component AND
  // shared constants/hooks (STAGES, useBuild). Fast-refresh warns about
  // mixed exports — that's fine here, suppress for these two files only.
  {
    files: ['src/App.jsx', 'src/context/BuildContext.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
