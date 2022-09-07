module.exports = {
  parser: '@typescript-eslint/parser',
  ignorePatterns: [
    'build',
    'node_modules',
    '.eslintrc.js',
  ],
  parserOptions: {
    sourceType: 'module',
    project: ['./tsconfig.json'],
  },
}
  