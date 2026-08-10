import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'node_modules/**'
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...reactHooks.configs.flat.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-confusing-void-expression': 'off'
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    ...tseslint.configs.disableTypeChecked
  },
  {
    files: ['src/engine/**/*.ts', 'src/simulations/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-dom', 'react-dom/*'],
              message: 'Engine and simulations must remain framework-independent.'
            },
            {
              group: ['node:*', 'fs', 'fs/*', 'child_process', 'child_process/*'],
              message: 'Runtime game logic must not access Node or host-system APIs.'
            }
          ]
        }
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'Mission logic must not make network requests.' },
        { name: 'XMLHttpRequest', message: 'Mission logic must not make network requests.' },
        { name: 'WebSocket', message: 'Mission logic must not open network connections.' }
      ],
      'no-eval': 'error',
      'no-new-func': 'error'
    }
  },
  prettier
);
