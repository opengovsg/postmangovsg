// eslint-disable-next-line no-undef
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react-hooks',
    'import',
    'simple-import-sort',
  ],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'plugin:react/recommended', // Recommended React rules
    'prettier', // Disables rules from `@typescript-eslint/recommended` that are covered by Prettier
    'plugin:prettier/recommended', // Recommended Prettier rules
  ],
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      typescript: {},
    },
  },
  parserOptions: {
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: ['./tsconfig.json'],
  },
  ignorePatterns: [
    'build',
    'dist',
    'node_modules',
    'jest.config.js',
    '.eslintrc.js',
    'config-overrides.js',
    'sentry.js',
    'locales/_build/',
    'locales/**/*.js',
  ],
  rules: {
    'react/prop-types': 'off', // No need proptypes since we're using TypeScript
    'react/jsx-uses-react': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
    'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies

    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
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
          // Packages. `react` related packages come first.
          // Things that start with a letter (or digit or underscore), or
          // `@` followed by a letter.
          ['^react', '^@?\\w'],
          // Root imports
          // Shared imports should be separate from application imports.
          ['^(shared)(/.*|$)'],
          [
            '^(~assets)(/.*|$)',
            '^(~classes)(/.*|$)',
            '^(~components)(/.*|$)',
            '^(~contexts)(/.*|$)',
            '^(~locales)(/.*|$)',
            '^(~routes)(/.*|$)',
            '^(~services)(/.*|$)',
            '^(~styles)(/.*|$)',
            '^(~types)(/.*|$)',
          ],
          ['^(~pages)(/.*|$)'],
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
    // 'import/no-extraneous-dependencies': 'error',
  },
}
