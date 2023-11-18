const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/*
 * This is a custom ESLint configuration for use with
 * typescript packages.
 *
 * This config extends the Vercel Engineering Style Guide.
 * For more information, see https://github.com/vercel/style-guide
 *
 */

module.exports = {
  extends: [
    "@vercel/style-guide/eslint/node",
    "@vercel/style-guide/eslint/typescript",
  ].map(require.resolve),
  parserOptions: {
    project,
  },
  globals: {
    React: true,
    JSX: true,
  },
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: ["node_modules/", "dist/"],
  rules: {
    "import/no-default-export": "off",
    "no-unused-vars": [1, { args: "after-used", argsIgnorePattern: "^_" }],
    "prefer-const": [
      "error",
      { destructuring: "any", ignoreReadBeforeAssign: false },
    ],
    quotes: [2, "single", { avoidEscape: true, allowTemplateLiterals: true }],
    semi: ["warn", "always"],
    indent: ["warn", 2, { SwitchCase: 1 }],
    "no-multi-spaces": ["error"],
    "no-var": ["error"],
    "no-new-object": ["error"],
    "object-shorthand": ["error", "always"],
    "quote-props": ["error", "as-needed", { keywords: true }],
    "prefer-object-spread": "error",
    "no-array-constructor": "error",
    "prefer-destructuring": ["error", { object: true, array: true }],
    "import/no-extraneous-dependencies": ["error", { devDependencies: true }],
    "@typescript-eslint/no-unsafe-assignment": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-indexed-object-style": [
      "error",
      "index-signature",
    ],
  },
};
