import { defineConfig, devices } from '@playwright/test';

const chromiumExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:4173';
const webServerHost = process.env.PLAYWRIGHT_WEB_SERVER_HOST ?? '127.0.0.1';

const sharedBrowserUse = {
  ...devices['Desktop Chrome'],
  hasTouch: true,
  isMobile: false
} as const;

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    ...(chromiumExecutablePath === undefined
      ? {}
      : { launchOptions: { executablePath: chromiumExecutablePath } })
  },
  projects: [
    {
      name: 'chromium-desktop-landscape',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } }
    },
    {
      name: 'chromium-tablet-landscape',
      use: { ...sharedBrowserUse, viewport: { width: 1024, height: 700 } }
    },
    {
      name: 'chromium-tablet-portrait',
      use: { ...sharedBrowserUse, viewport: { width: 700, height: 1024 } }
    },
    {
      name: 'chromium-phone-landscape',
      use: { ...sharedBrowserUse, viewport: { width: 844, height: 390 } }
    },
    {
      name: 'chromium-phone-portrait',
      use: { ...sharedBrowserUse, viewport: { width: 390, height: 844 } }
    }
  ],
  webServer: {
    command: `pnpm preview --host ${webServerHost} --port 4173`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
