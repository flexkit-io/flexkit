import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx,cjs,mjs}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'import/no-default-export': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],

      'no-unused-vars': 'off',
      'no-multi-spaces': 'error',
      'no-new-object': 'error',
      'no-array-constructor': 'error',
      'no-var': 'error',

      'object-shorthand': ['error', 'always'],
      'prefer-object-spread': 'error',
      'quote-props': 'off',
      quotes: [2, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      semi: ['warn', 'always'],

      'prefer-const': ['warn', { destructuring: 'any', ignoreReadBeforeAssign: false }],
      'prefer-destructuring': 'off',

      '@typescript-eslint/no-unused-vars': ['warn', { args: 'after-used', argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-unused-expressions': [
        'warn',
        { allowShortCircuit: true, allowTernary: true, allowTaggedTemplates: true },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/consistent-type-definitions': 'off',
      '@typescript-eslint/consistent-indexed-object-style': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
    },
  },

  {
    files: ['**/*.cjs', '**/*.config.{js,cjs}'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  }
);
