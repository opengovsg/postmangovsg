module.exports = {
  extends: ['../../.eslintrc.js'],
  ignorePatterns: ['webpack.config.js', '*.mjs'],
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
}
  