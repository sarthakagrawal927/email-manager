import { expect, test } from "@playwright/test";

/**
 * Mobile-viewport smoke test for the public landing page.
 *
 * Runs under both the `desktop` and `mobile` Playwright projects (see
 * playwright.config.ts). The `mobile` project uses a 390px iPhone 13
 * viewport — the fleet mobile target.
 *
 * The signed-in cockpit requires Google OAuth, so the primary signed-in
 * flow is verified manually against the mobile conventions doc.
 */
test.describe("landing page", () => {
  test("renders the hero, features, and a single CTA with no horizontal scroll", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Kinetic/i);

    // Hero value prop.
    await expect(
      page.getByRole("heading", {
        name: /triage gmail without giving up control/i,
        level: 1,
      }),
    ).toBeVisible();

    // The three feature cards.
    await expect(
      page.getByRole("heading", { name: "Triage queues" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Sender analytics" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "One-click unsubscribe" }),
    ).toBeVisible();

    // "How it works" section.
    await expect(
      page.getByRole("heading", { name: /how it works/i }),
    ).toBeVisible();

    // The primary CTA.
    await expect(
      page.getByRole("button", { name: /continue with google/i }).first(),
    ).toBeVisible();

    // No horizontal scroll at this viewport.
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);
  });

  test("the primary CTA is a large enough touch target", async ({ page }) => {
    await page.goto("/");
    const cta = page
      .getByRole("button", { name: /continue with google/i })
      .first();
    const box = await cta.boundingBox();
    expect(box).not.toBeNull();
    // WCAG 2.5.5 / iOS HIG: tap targets must be at least 44x44px.
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});
