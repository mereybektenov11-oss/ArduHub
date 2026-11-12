import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: '../../tests/e2e', workers: 1, timeout: 45000, use: { baseURL: 'http://127.0.0.1:3116', channel: 'chrome', headless: true }, webServer: { command: 'pnpm start --port 3116', url: 'http://127.0.0.1:3116', reuseExistingServer: true }, reporter: 'list' });
