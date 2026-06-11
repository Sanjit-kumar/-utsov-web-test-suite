// ============================================================
// FUNCTIONAL TEST: Scroll, Interaction & Page Section Rendering
// Tests sticky nav, scroll reveal animations, no horizontal
// overflow, mobile hamburger, anchor scrolling, FAQ accordion,
// social links, and all page section visibility on all pages.
// ============================================================
const { test, expect } = require('@playwright/test');

// ── Sticky Navigation ─────────────────────────────────────
test.describe('Sticky Navigation', () => {

  test('Header is visible at top of page', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header, #hdr');
    await expect(header.first()).toBeVisible();
  });

  test('Header becomes "scrolled" after scrolling down', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 300));
    await page.waitForTimeout(600);
    const isScrolled = await page.locator('header, #hdr').first().evaluate(
      el => el.classList.contains('scrolled')
    );
    expect(isScrolled).toBeTruthy();
  });

  test('Nav logo is always visible after scrolling', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    await expect(page.locator('.nav-logo, a.logo-link').first()).toBeVisible();
  });

  test('Nav stays in viewport at middle of page', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(400);
    const inViewport = await page.locator('header, #hdr').first().evaluate(el => {
      const rect = el.getBoundingClientRect();
      return rect.top >= 0 && rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);
    });
    expect(inViewport).toBeTruthy();
  });

});

// ── Scroll Reveal Animations ──────────────────────────────
test.describe('Scroll Reveal Animations', () => {

  test('Scroll reveal elements get .in class when scrolled into view', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1000);
    const animatedCount = await page.evaluate(() =>
      document.querySelectorAll('.rv.in').length
    );
    expect(animatedCount).toBeGreaterThan(0);
  });

  test('All sections become visible after full page scroll', async ({ page }) => {
    await page.goto('/');
    // Scroll through the entire page
    await page.evaluate(async () => {
      const totalHeight = document.body.scrollHeight;
      for (let y = 0; y < totalHeight; y += 400) {
        window.scrollTo(0, y);
        await new Promise(r => setTimeout(r, 100));
      }
    });
    await page.waitForTimeout(500);
    const remaining = await page.evaluate(() =>
      document.querySelectorAll('.rv:not(.in)').length
    );
    expect(remaining).toBe(0);
  });

  test('Page scrolls to bottom without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }));
    await page.waitForTimeout(1500);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(100);
    expect(errors.filter(e => !e.includes('favicon'))).toHaveLength(0);
  });

});

// ── Horizontal Overflow (No Side Scroll) ──────────────────
test.describe('No Horizontal Overflow', () => {

  const allPages = ['/', '/artists.html', '/events.html', '/philanthropy.html',
                    '/sponsorship.html', '/contact.html'];

  for (const url of allPages) {
    test(`No horizontal scroll bar on ${url}`, async ({ page }) => {
      await page.goto(url);
      await page.waitForLoadState('domcontentloaded');
      const hasOverflow = await page.evaluate(() => {
        return document.body.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasOverflow, `Horizontal overflow on ${url}`).toBeFalsy();
    });
  }

});

// ── Mobile Hamburger Menu ─────────────────────────────────
test.describe('Mobile Hamburger Menu', () => {

  test('Hamburger toggle is visible on mobile', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#navToggle, .nav-toggle, .hamburger, button[aria-label*="menu"]');
    if (await toggle.count() > 0) {
      await expect(toggle.first()).toBeVisible();
    }
  });

  test('Mobile menu opens when hamburger is clicked', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#navToggle, .nav-toggle, button[aria-label*="menu"]').first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(400);
      const menu = page.locator('#mobileNav, .mobile-nav, nav.open, .nav-mobile');
      if (await menu.count() > 0) {
        const isOpen = await menu.first().evaluate(el =>
          el.classList.contains('open') || el.classList.contains('active') ||
          window.getComputedStyle(el).display !== 'none'
        );
        expect(isOpen).toBeTruthy();
      }
    }
  });

  test('Mobile menu closes when hamburger is clicked again', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#navToggle, .nav-toggle, button[aria-label*="menu"]').first();
    if (await toggle.count() > 0) {
      await toggle.click(); // open
      await page.waitForTimeout(400);
      await toggle.click(); // close
      await page.waitForTimeout(400);
      const menu = page.locator('#mobileNav, .mobile-nav').first();
      if (await menu.count() > 0) {
        const isClosed = await menu.evaluate(el =>
          !el.classList.contains('open') && !el.classList.contains('active')
        );
        expect(isClosed).toBeTruthy();
      }
    }
  });

  test('Mobile menu nav links navigate correctly', async ({ page }) => {
    await page.goto('/');
    const toggle = page.locator('#navToggle, .nav-toggle').first();
    if (await toggle.count() > 0) {
      await toggle.click();
      await page.waitForTimeout(400);
      const artistsLink = page.locator('#mobileNav a:has-text("Artists"), .mobile-nav a:has-text("Artists")').first();
      if (await artistsLink.count() > 0) {
        await artistsLink.click();
        await expect(page).toHaveURL(/artists\.html/);
      }
    }
  });

});

// ── Anchor / Section Scroll ───────────────────────────────
test.describe('Anchor & Section Scroll', () => {

  test('Clicking "Get Passes" scrolls to tickets section on events page', async ({ page }) => {
    await page.goto('/events.html');
    const passesBtn = page.locator('a[href="#tickets"], a:has-text("Get Passes"), a:has-text("Get Your Passes")').first();
    if (await passesBtn.count() > 0) {
      await passesBtn.click();
      await page.waitForTimeout(800);
      const ticketVisible = await page.locator('#tickets').isVisible().catch(() => false);
      expect(ticketVisible).toBeTruthy();
    }
  });

  test('#volunteer hash scrolls volunteer section into view', async ({ page }) => {
    await page.goto('/contact.html#volunteer');
    await page.waitForTimeout(800);
    const volSection = page.locator('#volunteer');
    await expect(volSection).toBeVisible();
  });

  test('#donate hash scrolls to donate section on philanthropy', async ({ page }) => {
    await page.goto('/philanthropy.html#donate');
    await page.waitForTimeout(800);
    const donateSection = page.locator('#donate');
    if (await donateSection.count() > 0) {
      await expect(donateSection).toBeVisible();
    }
  });

});

// ── FAQ Accordion Interaction ─────────────────────────────
test.describe('FAQ Accordion', () => {

  test('FAQ items exist on events page', async ({ page }) => {
    await page.goto('/events.html');
    const faqItems = page.locator('.faq-item, .faq-q');
    expect(await faqItems.count()).toBeGreaterThan(0);
  });

  test('FAQ opens on click and shows answer', async ({ page }) => {
    await page.goto('/events.html');
    const faqQ = page.locator('.faq-q').first();
    if (await faqQ.count() > 0) {
      await faqQ.click();
      await page.waitForTimeout(400);
      const isOpen = await page.locator('.faq-item').first().evaluate(
        el => el.classList.contains('open')
      );
      expect(isOpen).toBeTruthy();
    }
  });

  test('FAQ collapses on second click', async ({ page }) => {
    await page.goto('/events.html');
    const faqQ = page.locator('.faq-q').first();
    if (await faqQ.count() > 0) {
      await faqQ.click();
      await page.waitForTimeout(300);
      await faqQ.click();
      await page.waitForTimeout(300);
      const isClosed = await page.locator('.faq-item').first().evaluate(
        el => !el.classList.contains('open')
      );
      expect(isClosed).toBeTruthy();
    }
  });

});

// ── Page Section Visibility ───────────────────────────────
test.describe('All Page Sections Render', () => {

  test('Home: hero section visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero, section.hero').first()).toBeVisible();
  });

  test('Home: Five Sacred Days section renders with 5 pillars', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(500);
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Shashthi|Saptami|Ashtami|Navami|Dashami/i);
  });

  test('Home: artists section renders artist names', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Iman|Sourendro|SS Brothers/i);
  });

  test('Home: traditions section renders (Dhak/Sindoor)', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Dhak|Dhunuchi|Sindoor/i);
  });

  test('Home: PC Chandra sponsor section is visible', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/PC Chandra|Title Sponsor/i);
  });

  test('Home: philanthropy section rendered', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Philanthropy|charity|giving/i);
  });

  test('Home: footer renders with all columns', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    const footerText = await footer.innerText();
    expect(footerText).toMatch(/Navigate|Get Involved|Team Contacts/i);
  });

  test('Artists page: Iman Chakraborty card visible', async ({ page }) => {
    await page.goto('/artists.html');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Iman/i);
  });

  test('Artists page: Sourendro & Soumyojit card visible', async ({ page }) => {
    await page.goto('/artists.html');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Sourendro|Soumyojit/i);
  });

  test('Events page: schedule section renders days', async ({ page }) => {
    await page.goto('/events.html');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Saturday|Sunday|Oct 17|Oct 18/i);
  });

  test('Events page: ticket pricing cards render', async ({ page }) => {
    await page.goto('/events.html');
    const cards = page.locator('.ticket-card');
    if (await cards.count() > 0) {
      expect(await cards.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('Contact page: contact form and volunteer section visible', async ({ page }) => {
    await page.goto('/contact.html');
    await expect(page.locator('#contactForm, form').first()).toBeVisible();
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Volunteer/i);
  });

  test('Philanthropy page: charity org names visible', async ({ page }) => {
    await page.goto('/philanthropy.html');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/NJ Food Bank|BOAS|Vidyashree|Community Health/i);
  });

  test('Sponsorship page: sponsor tiers/packages visible', async ({ page }) => {
    await page.goto('/sponsorship.html');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Gold|Silver|Bronze|Platinum|Title/i);
  });

  test('All pages: garland or decorative divider renders', async ({ page }) => {
    await page.goto('/');
    const garland = page.locator('.garland-band, .garland, img[src*="garland"]');
    if (await garland.count() > 0) {
      await expect(garland.first()).toBeVisible();
    }
  });

});

// ── Social & External Links ───────────────────────────────
test.describe('Social Media Links', () => {

  test('Facebook link in footer is valid href', async ({ page }) => {
    await page.goto('/');
    const fb = page.locator('footer a[href*="facebook"]').first();
    if (await fb.count() > 0) {
      const href = await fb.getAttribute('href');
      expect(href).toMatch(/facebook\.com/);
    }
  });

  test('Instagram link in footer is valid href', async ({ page }) => {
    await page.goto('/');
    const ig = page.locator('footer a[href*="instagram"]').first();
    if (await ig.count() > 0) {
      const href = await ig.getAttribute('href');
      expect(href).toMatch(/instagram\.com/);
    }
  });

  test('YouTube link in footer is valid href', async ({ page }) => {
    await page.goto('/');
    const yt = page.locator('footer a[href*="youtube"]').first();
    if (await yt.count() > 0) {
      const href = await yt.getAttribute('href');
      expect(href).toMatch(/youtube\.com/);
    }
  });

  test('Social links open in new tab (target=_blank)', async ({ page }) => {
    await page.goto('/');
    const socialLinks = page.locator('footer a[href*="facebook"], footer a[href*="instagram"], footer a[href*="youtube"]');
    const count = await socialLinks.count();
    for (let i = 0; i < count; i++) {
      const target = await socialLinks.nth(i).getAttribute('target');
      expect(target, 'Social link should open in new tab').toBe('_blank');
    }
  });

  test('Team contact phone links in footer are callable (tel: href)', async ({ page }) => {
    await page.goto('/');
    const telLinks = page.locator('footer a[href^="tel"]');
    if (await telLinks.count() > 0) {
      expect(await telLinks.count()).toBeGreaterThanOrEqual(3);
    }
  });

});
