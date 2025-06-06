module.exports = {
  root: true,
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  globals: {
    firebase: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
  },
  ignorePatterns: [
    "/lib/**/*", "*.js" // Ignore built files.
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "quotes": ["error", "double", {
      "allowTemplateLiterals": true,
    }],
    "import/no-unresolved": 0,
    "@typescript-eslint/no-explicit-any": "off",
    "indent": 0,
    "linebreak-style": 0,
    "max-len": ["error", {
      code: 140,
    }],
    "new-cap": 0,
  },
};
