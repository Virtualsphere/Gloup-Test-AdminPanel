import { defineConfig, devices } from '@playwright/test'

// End-to-end tests. Run with `npm run test:e2e` — Playwright starts the Vite
// dev server itself (or reuses one already running on :5173).
// Docs: https://playwright.dev/docs/test-configuration
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // `list` prints each test with ✓ / ✘ in the terminal;
  // `html` builds the report that `npm run test:e2e:report` opens.
  reporter: [['list'], ['html']],

  use: {
    baseURL: 'http://localhost:5173',
    // Record every test, keep the trace (test-results/<test>/trace.zip) only if it fails.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
