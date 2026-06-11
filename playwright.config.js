// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },

  reporter: [
    ['json', { outputFile: 'test-results/results.json' }],
    ['html', { outputFolder: 'test-results/html-report', open: 'never' }],
    ['list']
  ],

  use: {
    baseURL: 'https://www.utsov.org',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 10000,
    navigationTimeout: 30000,
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'Desktop',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  outputDir: 'test-results/artifacts',
});
