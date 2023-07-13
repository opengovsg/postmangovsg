module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "simple-import-sort"],
  extends: [
    //
    "plugin:@typescript-eslint/recommended",
    // eslint-plugin-prettier - runs prettier as eslint rule
    "plugin:prettier/recommended",
    // eslint-config-prettier - has to be last to disable conflicting rules
    "prettier",
  ],
  ignorePatterns: [
    "build",
    "tsconfig.json",
    ".eslintrc.js",
    "graphql.ts",
    "src/scripts/*.ts",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/member-delimiter-style": [
      "error",
      {
        multiline: {
          delimiter: "none",
          requireLast: true,
        },
        singleline: {
          delimiter: "semi",
          requireLast: false,
        },
      },
    ],
    // Rules for auto sort of imports
    "simple-import-sort/imports": [
      "error",
      {
        groups: [
          // Side effect imports.
          ["^\\u0000"],
          // Packages.
          // Things that start with a letter (or digit or underscore), or
          // `@` followed by a letter.
          ["^@?\\w"],
          // Absolute imports, must include `@/`
          ["^@/"],
          // Parent imports. Put `..` last.
          ["^\\.\\.(?!/?$)", "^\\.\\./?$"],
          // Other relative imports. Put same-folder imports and `.` last.
          ["^\\./(?=.*/)(?!/?$)", "^\\.(?!/?$)", "^\\./?$"],
        ],
      },
    ],
    "simple-import-sort/exports": "error",
  },
};
