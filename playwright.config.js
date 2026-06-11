// @ts-check
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: false,
  retries: 1,
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
    {
      name: 'Android',
      use: {
        ...devices['Pixel 5'],
        // Increased timeouts — Pixel 5 emulation is slow against remote servers
        actionTimeout: 30000,
        navigationTimeout: 45000,
      },
      testIgnore: ['**/01-navigation.spec.js'],
    },
    {
      name: 'Mac',
      // Chromium with macOS Safari user-agent — reliable cross-platform Safari simulation.
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        deviceScaleFactor: 2,
        isMobile: false,
        hasTouch: false,
      },
      testIgnore: ['**/02-mobile-menu.spec.js'],
    },
  ],

  outputDir: 'test-results/artifacts',
});
