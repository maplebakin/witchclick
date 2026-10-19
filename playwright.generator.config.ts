import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: /generator-dev\.spec\.ts$/,
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], headless: true, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
