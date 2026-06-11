// ============================================================
// FUNCTIONAL TEST: Mobile / Hamburger Menu
// Tests burger menu visibility, open/close, and link behavior
// on mobile viewports
// ============================================================
const { test, expect } = require('@playwright/test');

test.describe('Mobile Hamburger Menu', () => {

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test('Hamburger button is visible on mobile', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await expect(burger).toBeVisible();
  });

  test('Desktop nav links are hidden on mobile', async ({ page }) => {
    await page.goto('/');
    // The nav ul should be hidden (not displayed as flex row) on mobile
    const navUl = page.locator('nav ul');
    // It should either be hidden or in a closed state
    const isVisible = await navUl.isVisible();
    // Nav ul is position:fixed and display:none when closed on mobile
    expect(isVisible).toBeFalsy();
  });

  test('Hamburger click opens the mobile menu overlay', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await burger.click();
    const navUl = page.locator('nav ul');
    await expect(navUl).toBeVisible({ timeout: 3000 });
  });

  test('Mobile menu shows all nav links when open', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menuToggle, .menu-toggle').click();
    await page.waitForTimeout(500);
    const links = ['Artists', 'Events', 'Philanthropy', 'Sponsor', 'Contact'];
    for (const link of links) {
      await expect(page.locator(`nav ul a:has-text("${link}")`)).toBeVisible();
    }
  });

  test('Clicking a menu link in mobile overlay closes the menu and navigates', async ({ page }) => {
    await page.goto('/');
    await page.locator('#menuToggle, .menu-toggle').click();
    await page.waitForTimeout(400);
    await page.locator('nav ul a:has-text("Artists")').click();
    await expect(page).toHaveURL(/artists\.html/);
    // Menu should be closed after navigation
    await page.waitForTimeout(500);
    const navUl = page.locator('nav ul');
    const isOpen = await navUl.evaluate(el => el.classList.contains('open'));
    expect(isOpen).toBeFalsy();
  });

  test('Hamburger button toggles close (X) state when menu is open', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await burger.click();
    await page.waitForTimeout(300);
    const isOpen = await burger.evaluate(el => el.classList.contains('open'));
    expect(isOpen).toBeTruthy();
  });

  test('Clicking hamburger again closes the mobile menu', async ({ page }) => {
    await page.goto('/');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await burger.click();
    await page.waitForTimeout(400);
    await burger.click();
    await page.waitForTimeout(400);
    const navUl = page.locator('nav ul');
    const isOpen = await navUl.evaluate(el => el.classList.contains('open'));
    expect(isOpen).toBeFalsy();
  });

  test('Mobile menu works on Events page', async ({ page }) => {
    await page.goto('/events.html');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator('nav ul')).toBeVisible({ timeout: 3000 });
  });

  test('Mobile menu works on Contact page', async ({ page }) => {
    await page.goto('/contact.html');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator('nav ul')).toBeVisible({ timeout: 3000 });
  });

  test('Mobile menu works on Philanthropy page', async ({ page }) => {
    await page.goto('/philanthropy.html');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator('nav ul')).toBeVisible({ timeout: 3000 });
  });

  test('Mobile menu works on Artists page', async ({ page }) => {
    await page.goto('/artists.html');
    const burger = page.locator('#menuToggle, .menu-toggle');
    await expect(burger).toBeVisible();
    await burger.click();
    await expect(page.locator('nav ul')).toBeVisible({ timeout: 3000 });
  });

});

test.describe('Tablet Viewport', () => {

  test.use({ viewport: { width: 768, height: 1024 } });

  test('Page renders correctly at tablet width', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();
    // Either hamburger or full nav should be visible
    const burger = page.locator('#menuToggle, .menu-toggle');
    const navLinks = page.locator('nav ul');
    const eitherVisible = (await burger.isVisible()) || (await navLinks.isVisible());
    expect(eitherVisible).toBeTruthy();
  });

});
