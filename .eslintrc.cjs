/** @type {import('@typescript-eslint/utils').TSESLint.Linter.Config} */
module.exports = {
  env: {
    browser: true,
    es2017: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:svelte/recommended', 'prettier'],
  ignorePatterns: ['*.cjs', 'static/*.worker.js', 'static/*.worker.js.map'],
  overrides: [
    {
      files: ['*.svelte'],
      parser: 'svelte-eslint-parser',
      parserOptions: {
        parser: '@typescript-eslint/parser',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    extraFileExtensions: ['.svelte'],
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  root: true,
  rules: {
    '@typescript-eslint/member-ordering': [
      'error',
      {
        default: {
          memberTypes: ['call-signature', 'field', 'constructor', 'get', 'method', 'set', 'signature'],
          order: 'alphabetically',
        },
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true, argsIgnorePattern: '^_' }],
    curly: 2,
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    'no-undef': 'off',
    'sort-keys': ['error', 'asc', { caseSensitive: true, natural: false, minKeys: 2 }],
  },
};
