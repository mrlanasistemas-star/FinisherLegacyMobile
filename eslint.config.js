// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", ".expo/*", "android/*", "ios/*"],
  },
  {
    // Jest setup runs in the Jest runtime, where `jest` is a global.
    files: ["jest.setup.js"],
    languageOptions: { globals: { jest: "readonly" } },
  }
]);
