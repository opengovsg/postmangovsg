module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/eslint-recommended', // Disables rules from `eslint:recommended` that are already covered by the TypeScript typechecker
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'plugin:react/recommended', // Recommended React rules
    'prettier/@typescript-eslint', // Disables rules from `@typescript-eslint/recommended` that are covered by Prettier
    'plugin:prettier/recommended', // Recommended Prettier rules
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  parserOptions: {
    sourceType: 'module',
  },
  ignorePatterns: [
    'build',
    'dist',
    'node_modules',
    'locales/_build/',
    'locales/**/*.js',
  ],
  rules: {
    'react/prop-types': 'off', // No need proptypes since we're using TypeScript
    'react-hooks/rules-of-hooks': 'error', // Checks rules of Hooks
    'react-hooks/exhaustive-deps': 'warn', // Checks effect dependencies

    '@typescript-eslint/no-use-before-define': ['error', { functions: false }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-types': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
  },
}
