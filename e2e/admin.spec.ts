import { expect, test } from "@playwright/test";

/**
 * Admin flows need a real signed-in owner. Set these to run the signed-in
 * cases; they are skipped otherwise so the suite still runs on a fresh clone.
 *
 *   E2E_OWNER_EMAIL=owner@shscollective.local
 *   E2E_OWNER_PASSWORD=...
 *
 * e2e/auth.setup.ts signs in once and stores the session for these tests.
 */
const hasOwner = Boolean(process.env.E2E_OWNER_EMAIL && process.env.E2E_OWNER_PASSWORD);

test.describe("admin access", () => {
  // Explicitly start without the saved owner session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("dashboard requires sign in and rejects invalid credentials", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Email").fill("intruder@example.com");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Email or password is incorrect." }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

test.describe("admin owner flows", () => {
  test.skip(!hasOwner, "Set E2E_OWNER_EMAIL and E2E_OWNER_PASSWORD to run admin flows.");

  test("owner sees the live dashboard and manages a category", async ({ page }) => {
    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "Store overview" })).toBeVisible();
    await expect(page.getByText("Pending orders", { exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Admin navigation" })).toBeVisible();

    const categoryName = `E2E Category ${Date.now()}`;
    const editedDescription = "Edited by the Playwright admin smoke test.";

    await page.getByRole("link", { name: "Categories" }).click();
    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();

    await page.getByLabel("Name", { exact: true }).fill(categoryName);
    await page.getByLabel("Slug", { exact: true }).fill("");
    await page.getByLabel("Order", { exact: true }).fill("99");
    await page.getByRole("button", { name: "Create category" }).click();

    await expect(page.getByText(/Category saved/)).toBeVisible();
    const row = page.getByRole("row", { name: new RegExp(categoryName) });
    await expect(row).toBeVisible();

    await row.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("button", { name: "Save category" })).toBeVisible();
    await page.getByLabel("Description (optional)").fill(editedDescription);
    await page.getByRole("button", { name: "Save category" }).click();
    await expect(page.getByText(/Category saved/)).toBeVisible();

    await page.goto("/admin/categories");
    const editedRow = page.getByRole("row", { name: new RegExp(editedDescription) });
    await expect(editedRow).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await editedRow.getByRole("button", { name: "Delete" }).click();
    // The row disappears once the server action revalidates the page.
    await expect(page.getByRole("row", { name: new RegExp(categoryName) })).toHaveCount(0);
  });

  test("owner creates a draft product and publishing is blocked without an image", async ({
    page,
  }) => {
    const title = `E2E Draft ${Date.now()}`;
    await page.goto("/admin/products/new");
    await expect(page.getByRole("heading", { name: "New product" })).toBeVisible();

    await page.getByRole("textbox", { name: "Title", exact: true }).fill(title);
    await page.getByRole("textbox", { name: "Price (INR)", exact: true }).fill("1500");
    await page.getByRole("button", { name: "Create product" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByText("Draft", { exact: true }).first()).toBeVisible();

    // Publishing without an uploaded image must be refused by the server.
    await page.getByLabel("Status", { exact: true }).selectOption("published");
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(
      page.getByRole("alert").filter({ hasText: "Add at least one product image before publishing." }),
    ).toBeVisible();
    await expect(
      page.getByText(/Add at least one product image before publishing/).first(),
    ).toBeVisible();

    // Clean up the test product (it has no order history, so deletion is allowed).
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Delete product permanently" }).click();
    await page.goto("/admin/products");
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("owner opens a new enquiry and cancels it", async ({ page }) => {
    // Create a real enquiry through the storefront so the order is genuine.
    const customerName = `Playwright Admin ${Date.now()}`;
    const phone = `8${String(Date.now()).slice(-9)}`;

    await page.goto("/product/demo-silk-blend-shirt");
    await page.getByRole("button", { name: "Add to bag" }).click();

    await page.goto("/checkout");
    await page.getByLabel("Full name").fill(customerName);
    await page.getByLabel("Phone (WhatsApp)").fill(phone);
    await page.getByLabel("Address line 1").fill("12 Test Lane");
    await page.getByLabel("City").fill("New Delhi");
    await page.getByLabel("State").fill("Delhi");
    await page.getByLabel("Pincode").fill("110001");
    await page.getByRole("button", { name: "Place order enquiry" }).click();
    await expect(
      page.getByRole("heading", { name: "Your enquiry is recorded" }),
    ).toBeVisible({ timeout: 20_000 });

    await page.goto(`/admin/orders?q=${encodeURIComponent(customerName)}`);
    const row = page.getByRole("row", { name: new RegExp(customerName) });
    await expect(row).toBeVisible();
    await row.getByRole("link", { name: "View" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toContainText("SHS-");
    await expect(page.getByText("Pending confirmation", { exact: true }).first()).toBeVisible();

    await page.getByLabel("Move to").selectOption("cancelled");
    await page.getByLabel("Note (optional)").fill("Cancelled by the Playwright admin test.");
    await page.getByRole("button", { name: "Update status" }).click();

    await expect(page.getByText("Order status updated.")).toBeVisible();
    await expect(page.getByText("Pending confirmation → Cancelled")).toBeVisible();
    await expect(page.getByText("Cancelled by the Playwright admin test.")).toBeVisible();
  });
});
