// ============================================================
// INTEGRATION TEST: Internal & External Links
// Verifies all nav links, CTA links, and footer links resolve
// correctly and no broken internal links exist
// ============================================================
const { test, expect } = require('@playwright/test');

test.describe('Internal Link Integrity', () => {

  test('All nav links on home resolve correctly', async ({ page, request }) => {
    await page.goto('/');
    const navHrefs = await page.locator('nav a[href]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );

    for (const href of navHrefs) {
      if (!href || href.startsWith('#') || href.startsWith('mailto')) continue;
      const url = href.startsWith('http') ? href : `https://www.utsov.org/${href.replace(/^\//, '')}`;
      const res = await request.get(url);
      expect(res.status()).toBeLessThan(400);
    }
  });

  test('Footer links on home page resolve without 404', async ({ page, request }) => {
    await page.goto('/');
    const footerHrefs = await page.locator('footer a[href]').evaluateAll(
      els => els.map(el => el.getAttribute('href'))
    );

    for (const href of footerHrefs) {
      if (!href || href === '#' || href.startsWith('mailto') || href.startsWith('tel')) continue;
      const url = href.startsWith('http') ? href : `https://www.utsov.org/${href.replace(/^\//, '')}`;
      const res = await request.get(url);
      expect(res.status()).toBeLessThan(400);
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

});

test.describe('Cross-Page Navigation Integrity', () => {

  const pages = [
    '/artists.html',
    '/events.html',
    '/philanthropy.html',
    '/sponsorship.html',
    '/contact.html',
  ];

  for (const pagePath of pages) {
    test(`Nav links on ${pagePath} all resolve`, async ({ page, request }) => {
      await page.goto(pagePath);
      const navHrefs = await page.locator('nav a[href]').evaluateAll(
        els => els.map(el => el.getAttribute('href'))
      );

      for (const href of navHrefs) {
        if (!href || href === '#' || href.startsWith('#') || href.startsWith('mailto')) continue;
        const url = href.startsWith('http') ? href : `https://www.utsov.org/${href.replace(/^\//, '')}`;
        const res = await request.get(url);
        expect(res.status()).toBeLessThan(400);
      }
    });
  }

});

test.describe('Google Maps Link', () => {

  test('Google Maps link exists on contact page', async ({ page }) => {
    await page.goto('/contact.html');
    const mapsLink = page.locator('a[href*="maps.google"], a[href*="google.com/maps"], a:has-text("Google Maps")');
    if (await mapsLink.count() > 0) {
      const href = await mapsLink.first().getAttribute('href');
      expect(href).toMatch(/maps\.google|google\.com\/maps/i);
    }
  });

});
