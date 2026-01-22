import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';

export default defineConfig(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      import: fixupPluginRules(importPlugin),
    },
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    rules: {
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
          'newlines-between': 'never',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
    },
  },
  {
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  prettier,
);
