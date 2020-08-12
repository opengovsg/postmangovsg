module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'prettier/@typescript-eslint', // Disables rules from `@typescript-eslint/recommended` that are covered by Prettier
    'plugin:prettier/recommended', // Recommended Prettier rules
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
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'variableLike',
        format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
}
