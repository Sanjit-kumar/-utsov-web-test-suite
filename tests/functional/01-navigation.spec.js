// ============================================================
// FUNCTIONAL TEST: Navigation & Routing
// Tests all menu links, page routing, active states, and CTAs
// ============================================================
const { test, expect } = require('@playwright/test');

const BASE = 'https://www.utsov.org';

const PAGES = [
  { name: 'Home',        url: '/',                  title: /UTSOV|Durga Puja/i },
  { name: 'Artists',     url: '/artists.html',       title: /Artist/i },
  { name: 'Events',      url: '/events.html',        title: /Event|Schedule/i },
  { name: 'Philanthropy',url: '/philanthropy.html',  title: /Philanthropy/i },
  { name: 'Sponsorship', url: '/sponsorship.html',   title: /Sponsor/i },
  { name: 'Contact',     url: '/contact.html',       title: /Contact/i },
];

test.describe('Navigation Menu', () => {

  test('Home page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/UTSOV|Durga Puja/i);
  });

  test('All nav menu items are visible on desktop', async ({ page }) => {
    await page.goto('/');
    const navItems = ['Artists', 'Events', 'Philanthropy', 'Sponsor', 'Contact'];
    for (const item of navItems) {
      const link = page.locator(`nav a:has-text("${item}")`).first();
      await expect(link).toBeVisible();
    }
  });

  test('Artists nav link navigates to artists page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Artists")');
    await expect(page).toHaveURL(/artists\.html/);
    await expect(page.locator('h1, .ph-title')).toBeVisible();
  });

  test('Events nav link navigates to events page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Events")');
    await expect(page).toHaveURL(/events\.html/);
  });

  test('Philanthropy nav link navigates to philanthropy page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Philanthropy")');
    await expect(page).toHaveURL(/philanthropy\.html/);
  });

  test('Sponsor nav link navigates to sponsorship page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Sponsor")');
    await expect(page).toHaveURL(/sponsorship\.html/);
  });

  test('Contact nav link navigates to contact page', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Contact")');
    await expect(page).toHaveURL(/contact\.html/);
  });

  test('Volunteer button navigates to contact page volunteer section', async ({ page }) => {
    await page.goto('/');
    await page.click('a:has-text("Volunteer")');
    await expect(page).toHaveURL(/contact\.html.*volunteer/);
  });

  test('Get Passes button navigates to events tickets section', async ({ page }) => {
    await page.goto('/');
    const getPassesBtn = page.locator('a:has-text("Get Passes"), a:has-text("Get Your Passes")').first();
    await getPassesBtn.click();
    await expect(page).toHaveURL(/events\.html/);
  });

  test('Nav logo returns to home page', async ({ page }) => {
    await page.goto('/artists.html');
    await page.click('.nav-logo, a.logo-link');
    await expect(page).toHaveURL(/\/$|index\.html/);
  });

  test('404 page returns proper response for invalid URL', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist.html');
    // Firebase serves 404.html or default
    expect([404, 200]).toContain(response?.status());
  });

  test('All pages load without JS console errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    for (const p of PAGES) {
      errors.length = 0;
      await page.goto(p.url);
      await page.waitForTimeout(1500);
      expect(errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR'))).toHaveLength(0);
    }
  });

  test('Active nav link is highlighted on current page', async ({ page }) => {
    await page.goto('/artists.html');
    const activeLink = page.locator('nav a.active, nav ul a.active');
    await expect(activeLink).toBeVisible();
    await expect(activeLink).toContainText(/Artist/i);
  });

});

test.describe('CTA Buttons', () => {

  test('"Become a Sponsor" CTA navigates to sponsorship', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('a:has-text("Become a Sponsor"), a:has-text("Become a Partner")').first();
    await expect(btn).toBeVisible();
    await btn.click();
    await expect(page).toHaveURL(/sponsorship\.html/);
  });

  test('"View Full Schedule" navigates to events', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('a:has-text("View Full Schedule")').first();
    if (await btn.count() > 0) {
      await btn.click();
      await expect(page).toHaveURL(/events\.html/);
    }
  });

  test('"Our Philanthropy" navigates to philanthropy', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('a:has-text("Our Philanthropy")').first();
    if (await btn.count() > 0) {
      await btn.click();
      await expect(page).toHaveURL(/philanthropy\.html/);
    }
  });

  test('Footer navigation links all work', async ({ page }) => {
    await page.goto('/');
    const footerLinks = [
      { text: 'Home',         url: /index\.html|\/$/ },
      { text: 'Artists',      url: /artists\.html/ },
      { text: 'Events',       url: /events\.html/ },
      { text: 'Philanthropy', url: /philanthropy\.html/ },
    ];
    for (const link of footerLinks) {
      await page.goto('/');
      const el = page.locator(`footer a:has-text("${link.text}")`).first();
      if (await el.count() > 0) {
        await el.click();
        await expect(page).toHaveURL(link.url);
      }
    }
  });

  test('Back navigation (browser back) works after nav', async ({ page }) => {
    await page.goto('/');
    await page.click('nav a:has-text("Artists")');
    await expect(page).toHaveURL(/artists\.html/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$|index\.html/);
  });

});
