module.exports = {
  root: false,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parserOptions: {
    sourceType: 'module'
  },
  ignorePatterns: [
    '**/build',
    '**/dist',
    '**/node_modules'
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', { 
      "argsIgnorePattern": "^_" 
    }],
    'comma-dangle': [
      'error',
      'always-multiline'
    ],
    'indent': [
      'error',
      2
    ],
    'newline-per-chained-call': [
      'error',
      {
        'ignoreChainWithDepth': 2
      }
    ],
    'no-console': [
      'warn',
      {
        'allow': [
          'warn',
          'error'
        ]
      }
    ],
    'quotes': [
      'error',
      'single'
    ],
    'space-before-function-paren': [
      'error',
      {
        'anonymous': 'always',
        'named': 'never',
        'asyncArrow': 'always'
      }
    ],
    'arrow-spacing': [
      'error',
      { 'before': true, 'after': true },
    ],
    'semi': [
      'error',
      'never'
    ],
    'object-curly-spacing': [
      'error',
      'always'
    ],
    '@typescript-eslint/no-use-before-define': ['error',
      { 'functions': false }
    ]
  }
}
