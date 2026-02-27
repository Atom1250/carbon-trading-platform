import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  retries: 0,
  webServer: {
    command:
      'cd /Users/atom/Projects/carbon-trading-workspace/carbon-trading-platform/apps/web-app && NEXT_PUBLIC_API_URL=http://localhost:3001 next dev -p 3000',
    url: 'http://127.0.0.1:3000',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  outputDir: '../../test-output/playwright-artifacts',
  reporter: [
    ['list'],
    ['html', { outputFolder: '../../test-output/playwright-report', open: 'never' }],
    ['junit', { outputFile: '../../test-output/playwright-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
  },
});
