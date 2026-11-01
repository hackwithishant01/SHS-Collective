import { expect, test } from "@playwright/test";

test.describe("storefront", () => {
  test("home page and shop filters render real catalogue data", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Built on Style." })).toBeVisible();
    await expect(page.getByText("Demo catalogue", { exact: false }).first()).toBeVisible();
    await expect(page.locator("article").first()).toBeVisible();

    await page.goto("/shop");
    await expect(page.getByRole("heading", { name: "All pieces" })).toBeVisible();
    await expect(page.locator("article")).toHaveCount(10);
    await expect(page.getByText("10 pieces", { exact: false })).toBeVisible();

    await page.goto("/shop?category=outerwear");
    await expect(page.getByRole("heading", { name: "Outerwear" })).toBeVisible();
    await expect(page.locator("article")).toHaveCount(2);

    await page.goto("/shop?category=outerwear&sort=price_asc");
    const prices = await page.locator("article").allInnerTexts();
    expect(prices[0]).toContain("2,899");
    expect(prices[1]).toContain("4,999");
  });

  test("product variants, wishlist and cart persist across navigation", async ({ page }) => {
    await page.goto("/product/demo-wool-blend-overcoat");

    await expect(
      page.getByRole("heading", { name: "Demo — Wool-Blend Overcoat", level: 1 }),
    ).toBeVisible();
    await expect(page.getByText("Pre-owned", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Only 1 left in this option.")).toBeVisible();

    await page.getByRole("button", { name: "Save to wishlist" }).click();
    await expect(page.getByRole("button", { name: "Remove from wishlist" })).toBeVisible();

    await page.getByRole("button", { name: "Add to bag" }).click();
    await expect(page.getByText("Added to your bag.")).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Demo — Wool-Blend Overcoat").first()).toBeVisible();
    await expect(page.getByText("₹4,999").first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue to checkout" })).toBeVisible();

    await page.goto("/wishlist");
    await expect(page.getByText("Demo — Wool-Blend Overcoat").first()).toBeVisible();
  });

  test("checkout validates details and creates a pending WhatsApp enquiry", async ({ page }) => {
    await page.goto("/product/demo-silk-blend-shirt");
    await expect(page.getByRole("button", { name: "Add to bag" })).toBeVisible();
    await page.getByRole("button", { name: "Add to bag" }).click();

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: "Checkout", level: 1 })).toBeVisible();

    // Submitting empty required fields is stopped client-side.
    await page.getByRole("button", { name: "Place order enquiry" }).click();
    await expect(page.getByText("Enter your full name")).toBeVisible();
    await expect(page.getByText("Enter a phone number")).toBeVisible();

    await page.getByLabel("Full name").fill("Playwright Checkout");
    // A new number each run avoids the per-phone rate limit on repeat runs.
    const phone = `9${String(Date.now()).slice(-9)}`;
    await page.getByLabel("Phone (WhatsApp)").fill(phone);
    await page.getByLabel("Address line 1").fill("12 Test Lane");
    await page.getByLabel("City").fill("New Delhi");
    await page.getByLabel("State").fill("Delhi");
    await page.getByLabel("Pincode").fill("110001");

    await page.getByRole("button", { name: "Place order enquiry" }).click();

    await expect(
      page.getByRole("heading", { name: "Your enquiry is recorded" }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("Pending confirmation").first()).toBeVisible();
    await expect(page.getByText(/^SHS-/).first()).toBeVisible();

    const whatsapp = page.getByRole("link", { name: "Send order on WhatsApp" });
    await expect(whatsapp).toBeVisible();
    const href = await whatsapp.getAttribute("href");
    expect(href).toContain("https://wa.me/919711366699");
    expect(href).toContain("text=");

    // The cart is cleared only after a successful enquiry.
    await page.goto("/cart");
    await expect(page.getByText("Your bag is empty")).toBeVisible();
  });

  test("metadata, sitemap and robots expose public pages only", async ({ request }) => {
    const home = await request.get("/");
    expect(await home.text()).toContain('rel="canonical"');

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.ok()).toBeTruthy();
    const sitemapBody = await sitemap.text();
    expect(sitemapBody).toContain("/shop");
    expect(sitemapBody).toContain("/product/demo-wool-blend-overcoat");

    const robots = await request.get("/robots.txt");
    expect(robots.ok()).toBeTruthy();
    const robotsBody = await robots.text();
    expect(robotsBody).toContain("Disallow: /admin");
    expect(robotsBody).toContain("Sitemap: http://localhost:3000/sitemap.xml");
  });
});
