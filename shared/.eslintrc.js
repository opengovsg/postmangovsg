/* eslint-disable */
module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'simple-import-sort', 'import'],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/eslint-recommended', // Disables rules from `eslint:recommended` that are already covered by the TypeScript typechecker
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'prettier',
    'plugin:prettier/recommended', // Recommended Prettier rules
  ],
  parserOptions: {
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: [
    'build',
    'dist',
    'node_modules',
    'jest.config.js',
    '.eslintrc.js',
  ],
  rules: {
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },

      {
        selector: ['variable', 'enumMember'],
        format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },

      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
      {
        selector: 'variable',
        modifiers: ['destructured'],
        format: null,
      },
      {
        selector: [
          'typeProperty',
          'objectLiteralProperty',
          'objectLiteralMethod',
        ],
        format: null,
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-floating-promises': ['error'],

    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
    // Rules for auto sort of imports
    'simple-import-sort/imports': [
      'error',
      {
        groups: [
          // Side effect imports.
          ['^\\u0000'],
          // Packages.
          // Things that start with a letter (or digit or underscore), or
          // `@` followed by a letter.
          ['^@?\\w'],
          // Absolute imports, must include `/` and cannot include `@`
          ['^([\\w-]+)/'],
          // Parent imports. Put `..` last.
          ['^\\.\\.(?!/?$)', '^\\.\\./?$'],
          // Other relative imports. Put same-folder imports and `.` last.
          ['^\\./(?=.*/)(?!/?$)', '^\\.(?!/?$)', '^\\./?$'],
        ],
      },
    ],
    'simple-import-sort/exports': 'error',
    'import/first': 'error',
    'import/newline-after-import': 'error',
    'import/no-duplicates': 'error',
    'import/no-extraneous-dependencies': 'error',
  },
}
