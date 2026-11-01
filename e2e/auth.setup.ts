import fs from "node:fs";
import path from "node:path";
import { expect, test as setup } from "@playwright/test";

const ownerState = path.join("test-results", ".auth", "owner.json");

/**
 * Signs in once through the real form and saves the session, so the admin
 * specs do not each consume a login attempt. Skipped without credentials.
 */
setup("sign in as the store owner", async ({ page }) => {
  const email = process.env.E2E_OWNER_EMAIL;
  const password = process.env.E2E_OWNER_PASSWORD;
  setup.skip(!email || !password, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD.");

  fs.mkdirSync(path.dirname(ownerState), { recursive: true });

  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();

  // First compilation after a cold dev start can take several seconds.
  await expect(page).toHaveURL(/\/admin$/, { timeout: 30_000 });
  await expect(page.getByRole("heading", { name: "Store overview" })).toBeVisible({
    timeout: 30_000,
  });

  await page.context().storageState({ path: ownerState });
});
