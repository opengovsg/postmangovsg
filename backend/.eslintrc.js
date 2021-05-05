module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', "jest"],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/eslint-recommended', // Disables rules from `eslint:recommended` that are already covered by the TypeScript typechecker
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'prettier/@typescript-eslint', // Disables rules from `@typescript-eslint/recommended` that are covered by Prettier
    'plugin:prettier/recommended', // Recommended Prettier rules
    "plugin:jest/recommended" // Recommended Jest rules
  ],
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['build', 'dist', 'node_modules'],
  rules: {
    '@typescript-eslint/camelcase': [
      'error',
      { properties: 'never', ignoreDestructuring: true },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

    'no-console': [
      'warn',
      {
        allow: ['warn', 'error'],
      },
    ],
  },
}
