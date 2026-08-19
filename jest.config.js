// Jest runs the API against a single in-memory MongoDB started in globalSetup.
// The generous timeout covers first-run binary download/startup.
module.exports = {
  testEnvironment: "node",
  testTimeout: 60000,
  globalSetup: "<rootDir>/tests/globalSetup.js",
  globalTeardown: "<rootDir>/tests/globalTeardown.js",
  testMatch: ["**/tests/**/*.test.js"],
};
