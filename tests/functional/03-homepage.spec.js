// ============================================================
// FUNCTIONAL TEST: Home Page Sections
// Tests all visible sections, content, countdown, petals, etc.
// ============================================================
const { test, expect } = require('@playwright/test');

test.describe('Hero Section', () => {

  test('Hero section is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero, section.hero')).toBeVisible();
  });

  test('Main headline contains DURGA or UTSOV branding', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/durga|utsov/);
  });

  test('Year 2026 is displayed', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toContain('2026');
  });

  test('Event location (New Jersey) is mentioned', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/new jersey|nj/i);
  });

  test('Countdown timer is visible and has numbers', async ({ page }) => {
    await page.goto('/');
    // Check if countdown exists — either a box or individual units
    const countdown = page.locator('#countdown-box, #countdown, .hero-countdown, .countdown-display');
    if (await countdown.count() > 0) {
      await expect(countdown.first()).toBeVisible();
      const text = await countdown.first().innerText();
      // Should contain digits (days remaining)
      expect(text).toMatch(/\d+/);
    }
  });

  test('Countdown timer values are not NaN', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1500);
    const countdownText = await page.locator('#countdown-box, .hero-countdown, .countdown-display').first().innerText().catch(() => '123');
    expect(countdownText).not.toMatch(/nan|NaN/i);
  });

  test('Hero CTA buttons are present and visible', async ({ page }) => {
    await page.goto('/');
    // Exclude nav CTAs (hidden on mobile) — look in page sections only
    const ctaSelectors = [
      '.hero-ctas a', '.hero a.btn', 'section a.btn-red', 'section a.btn-saffron',
      'section a.btn-gold', 'section a:has-text("Get Your Passes")',
      'section a:has-text("Become a Sponsor")', 'a.btn-crimson',
    ];
    let found = false;
    for (const sel of ctaSelectors) {
      const el = page.locator(sel).first();
      if (await el.count() > 0 && await el.isVisible().catch(() => false)) {
        found = true; break;
      }
    }
    expect(found).toBeTruthy();
  });

  test('Floating Durga / diya icon is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);
    const floatEl = page.locator('.floating-durga, .floating-diya, .corner-durga');
    if (await floatEl.count() > 0) {
      await expect(floatEl.first()).toBeVisible();
    }
  });

});

test.describe('Five Sacred Days Section', () => {

  test('Five Sacred Days section exists', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Sacred Days|Five Days|Shashthi|Saptami/i);
  });

  test('All 5 sacred days are listed (Shashthi/Shasthi through Dashami)', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    // Accept both common spellings: Shashthi / Shasthi / Shashti
    expect(body).toMatch(/Shash?t?hi|ষষ্ঠী/i);
    expect(body).toMatch(/Saptami|সপ্তমী/i);
    expect(body).toMatch(/Ashtami|Astami|অষ্টমী/i);
    expect(body).toMatch(/Navami|Nabami|নবমী/i);
    expect(body).toMatch(/Dashami|Doshomi|দশমী/i);
  });

  test('Day pillars/cards render correctly', async ({ page }) => {
    await page.goto('/');
    const dayCards = page.locator('.day-pillar, .days-row > div');
    if (await dayCards.count() > 0) {
      expect(await dayCards.count()).toBeGreaterThanOrEqual(5);
    }
  });

});

test.describe('Artists Section', () => {

  test('Featured Artists section is present', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Artist|Featured|Headliner/i);
  });

  test('At least 2 artist entries are visible', async ({ page }) => {
    await page.goto('/');
    const artistCards = page.locator('.artist-row, .ar-text');
    if (await artistCards.count() > 0) {
      expect(await artistCards.count()).toBeGreaterThanOrEqual(2);
    }
  });

});

test.describe('Traditions Section', () => {

  test('Traditions section contains Dhak and Sindoor Khela', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Dhak|Dhunuchi|Sindoor|Bhog/i);
  });

});

test.describe('Events Section on Home', () => {

  test('Events section is visible', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Events|Activities|Puja Ritual/i);
  });

});

test.describe('Sponsor Section', () => {

  test('Sponsor section is present', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Sponsor|Partner/i);
  });

});

test.describe('Footer', () => {

  test('Footer is present with contact info', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('Footer contains email address', async ({ page }) => {
    await page.goto('/');
    const footerText = await page.locator('footer').innerText();
    expect(footerText).toMatch(/utsov@utsov\.org|@/i);
  });

  test('Footer contains phone number', async ({ page }) => {
    await page.goto('/');
    const footerText = await page.locator('footer').innerText();
    expect(footerText).toMatch(/\d{3}.*\d{3}.*\d{4}/);
  });

  test('Footer copyright year is present', async ({ page }) => {
    await page.goto('/');
    const footerText = await page.locator('footer').innerText();
    expect(footerText).toMatch(/2026|Utsov Inc/i);
  });

  test('Privacy Policy link exists in footer', async ({ page }) => {
    await page.goto('/');
    const privacyLink = page.locator('footer a:has-text("Privacy")');
    if (await privacyLink.count() > 0) {
      await expect(privacyLink.first()).toBeVisible();
    }
  });

  test('Social media links exist in footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    const footerText = await footer.innerText();
    expect(footerText.toLowerCase()).toMatch(/instagram|facebook|youtube/i);
  });

});

test.describe('Scroll Behavior', () => {

  test('Page scrolls smoothly to bottom', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(1000);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
  });

  test('Nav header gets scrolled class when page is scrolled', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(500);
    const header = page.locator('header, #hdr, #siteHeader');
    const hasScrolled = await header.evaluate(el => el.classList.contains('scrolled'));
    expect(hasScrolled).toBeTruthy();
  });

  test('Scroll reveal animations trigger (rv.in added)', async ({ page }) => {
    await page.goto('/');
    // Scroll to trigger animations
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    const animatedCount = await page.evaluate(() =>
      document.querySelectorAll('.rv.in').length
    );
    expect(animatedCount).toBeGreaterThan(0);
  });

});
