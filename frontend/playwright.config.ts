import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  // Expect both frontend (4200) and backend (3000) to be running
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../backend',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: 'npm start',
      port: 4200,
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
