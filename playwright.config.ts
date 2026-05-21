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
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // `--webpack` matches the project's build config (Next 16 defaults to
    // Turbopack, but email-manager carries a webpack config).
    command: "pnpm exec next dev --webpack",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    // Desktop baseline.
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    // Mobile-viewport project — iPhone 13 is 390px wide, the mobile target.
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
