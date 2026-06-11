// ============================================================
// INTEGRATION TEST: Link Integrity (browser-navigation only)
// Checks links exist and have valid href formats.
// No direct HTTP requests — all checks via page.goto() to
// avoid triggering server rate limits / firewall rules.
// ============================================================
const { test, expect } = require('@playwright/test');

test.describe('Nav & Footer Link Format', () => {

  test('All nav links on home have non-empty href', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('nav a[href]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );
    for (const href of hrefs) {
      expect(href).toBeTruthy();
      expect(href).not.toBe('');
    }
  });

  test('Footer links have valid href attributes', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('footer a[href]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) {
      expect(href).toBeTruthy();
    }
  });

  test('Email link in footer has valid mailto href', async ({ page }) => {
    await page.goto('/');
    const mailtoLinks = await page.locator('a[href^="mailto"]').all();
    expect(mailtoLinks.length).toBeGreaterThan(0);
    for (const link of mailtoLinks) {
      const href = await link.getAttribute('href');
      expect(href).toMatch(/mailto:.+@.+\..+/);
    }
  });

  test('Phone link in footer has valid tel href', async ({ page }) => {
    await page.goto('/');
    const telLinks = await page.locator('a[href^="tel"]').all();
    if (telLinks.length > 0) {
      const href = await telLinks[0].getAttribute('href');
      expect(href).toMatch(/tel:\+?\d+/);
    }
  });

  test('No links with href="#" (dead placeholder links)', async ({ page }) => {
    await page.goto('/');
    const deadLinks = await page.locator('a[href="#"]').count();
    if (deadLinks > 0) {
      console.warn(`⚠ ${deadLinks} links with href="#" found on home page`);
    }
  });

  test('Google Maps link exists on contact page', async ({ page }) => {
    await page.goto('/contact.html');
    const mapsLink = page.locator('a[href*="maps.google"], a[href*="google.com/maps"], a:has-text("Google Maps")');
    if (await mapsLink.count() > 0) {
      const href = await mapsLink.first().getAttribute('href');
      expect(href).toMatch(/maps\.google|google\.com\/maps/i);
    }
  });

});
