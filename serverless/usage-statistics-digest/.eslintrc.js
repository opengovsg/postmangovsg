module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended', // Recommended ESLint rules
    'plugin:@typescript-eslint/eslint-recommended', // Disables rules from `eslint:recommended` that are already covered by the TypeScript typechecker
    'plugin:@typescript-eslint/recommended', // Recommended TypeScript rules
    'plugin:prettier/recommended', // Recommended Prettier rules
  ],
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    node: true,
  },
  ignorePatterns: ['build', 'node_modules'],
}
