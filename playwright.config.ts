/**
 * Playwright config — desktop + mobile-viewport projects.
 *
 * The `mobile` project uses the iPhone 13 device descriptor (390px wide — the
 * fleet Wave 4 mobile target) so mobile-layout regressions are caught in CI
 * alongside the `desktop` baseline.
 *
 * Run only the mobile project:  pnpm exec playwright test --project=mobile
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:8787",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && wrangler dev",
    url: "http://localhost:8787",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});