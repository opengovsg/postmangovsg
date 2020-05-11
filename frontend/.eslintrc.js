module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
  ],
  settings: {
    "react": {
      "version": "detect"
    }
  },
  parserOptions: {
    sourceType: 'module'
  },
  ignorePatterns: [
    '**/build',
    '**/dist',
    '**/node_modules'
  ],
  rules: {
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      'argsIgnorePattern': '^_'
    }],
    '@typescript-eslint/no-use-before-define': ['error',
      { 'functions': false }
    ],
    'comma-dangle': [
      'error',
      'always-multiline'
    ],
    'indent': [
      'error',
      2,
      { 'SwitchCase': 1 }
    ],
    'newline-per-chained-call': [
      'error',
      {
        'ignoreChainWithDepth': 3
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
    'no-multi-spaces': 'error',
    'no-trailing-spaces': 'error',
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
    // No need for proptypes since we're using typescript
    'react/prop-types': 'off',
    'react/display-name': 'off',
    'react-hooks/exhaustive-deps': 'off'
  }
}