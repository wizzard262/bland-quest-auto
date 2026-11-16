// Playwright tests for the game, opened straight from the file (no server needed).
// They run in a visible window, a little slowed down, so you can watch.
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  timeout: 240000,
  use: {
    headless: false,
    viewport: { width: 1200, height: 900 },
    launchOptions: { slowMo: 25 },
  },
});
