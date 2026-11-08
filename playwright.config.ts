import { defineConfig, devices } from '@playwright/test';

const PORT = 5173;

/** 크로스 브라우징 검증: Chromium / Firefox / WebKit(Safari) + 모바일 뷰포트 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // 5개 브라우저 × axe 검사를 동시에 돌리면 로컬 PC 가 버거워 타임아웃/크래시가 난다
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 13'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run dev',
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
