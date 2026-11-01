import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

// Signed-in admin tests reuse a single owner session. Without credentials they
// are skipped, so a fresh clone can still run the public storefront suite.
const hasOwner = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);
const ownerState = "test-results/.auth/owner.json";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    ...(hasOwner ? [{ name: "setup", testMatch: /auth\.setup\.ts/ }] : []),
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        ...(hasOwner ? { storageState: ownerState } : {}),
      },
      dependencies: hasOwner ? ["setup"] : [],
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
