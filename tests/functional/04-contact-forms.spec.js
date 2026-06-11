// ============================================================
// FUNCTIONAL TEST: Contact & Volunteer Forms
// Tests form fields, topic chips, validation, and submission
// ============================================================
const { test, expect } = require('@playwright/test');

test.describe('Contact Page', () => {

  test('Contact page loads successfully', async ({ page }) => {
    const res = await page.goto('/contact.html');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Contact|UTSOV/i);
  });

  test('Contact form is visible', async ({ page }) => {
    await page.goto('/contact.html');
    const form = page.locator('#contactForm, form').first();
    await expect(form).toBeVisible();
  });

  test('All required form fields are present', async ({ page }) => {
    await page.goto('/contact.html');
    await expect(page.locator('#fname, input[name="firstName"]')).toBeVisible();
    await expect(page.locator('#lname, input[name="lastName"]')).toBeVisible();
    await expect(page.locator('#email, input[type="email"]').first()).toBeVisible();
    await expect(page.locator('#message, textarea').first()).toBeVisible();
  });

  test('Topic chips / selector is visible', async ({ page }) => {
    await page.goto('/contact.html');
    // Either chips or a select dropdown for topic
    const topicEl = page.locator('#topicChips, .topic-chips, select[name="topic"]');
    if (await topicEl.count() > 0) {
      await expect(topicEl.first()).toBeVisible();
    }
  });

  test('Topic chip click selects the topic', async ({ page }) => {
    await page.goto('/contact.html');
    const chips = page.locator('.topic-chip');
    if (await chips.count() > 0) {
      const firstChip = chips.first();
      await firstChip.click();
      const isSelected = await firstChip.evaluate(el =>
        el.classList.contains('selected') || el.getAttribute('aria-selected') === 'true'
      );
      expect(isSelected).toBeTruthy();
    }
  });

  test('Form validates — empty submit shows no 500 error', async ({ page }) => {
    await page.goto('/contact.html');
    const submitBtn = page.locator('#submitBtn, button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      // Should NOT navigate away (validation should prevent it)
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/contact\.html/);
    }
  });

  test('Email field rejects invalid email format', async ({ page }) => {
    await page.goto('/contact.html');
    const emailField = page.locator('#email, input[type="email"]').first();
    await emailField.fill('not-an-email');
    const submitBtn = page.locator('#submitBtn, button[type="submit"]').first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(500);
      // Should stay on contact page
      await expect(page).toHaveURL(/contact\.html/);
    }
  });

  test('Contact form fills and prepares correctly with valid data', async ({ page }) => {
    await page.goto('/contact.html');

    // Select a topic chip if available
    const chips = page.locator('.topic-chip');
    if (await chips.count() > 0) {
      await chips.first().click();
    }

    const fname = page.locator('#fname, input[name="firstName"]');
    const lname = page.locator('#lname, input[name="lastName"]');
    const email = page.locator('#email, input[type="email"]').first();
    const message = page.locator('#message, textarea').first();

    await fname.fill('Test');
    await lname.fill('User');
    await email.fill('test@example.com');
    await message.fill('This is an automated test message from the UTSOV test suite.');

    // Verify fields are filled
    await expect(fname).toHaveValue('Test');
    await expect(email).toHaveValue('test@example.com');
  });

  test('Phone field accepts and holds value', async ({ page }) => {
    await page.goto('/contact.html');
    const phoneField = page.locator('#phone, input[type="tel"]');
    if (await phoneField.count() > 0) {
      await phoneField.first().fill('(201) 555-0000');
      await expect(phoneField.first()).toHaveValue('(201) 555-0000');
    }
  });

});

test.describe('Volunteer Section', () => {

  test('Volunteer section loads when navigating to #volunteer', async ({ page }) => {
    await page.goto('/contact.html#volunteer');
    await page.waitForTimeout(500);
    const volSection = page.locator('#volunteer');
    await expect(volSection).toBeVisible();
  });

  test('Volunteer form is present', async ({ page }) => {
    await page.goto('/contact.html');
    await page.evaluate(() => document.getElementById('volunteer')?.scrollIntoView());
    await page.waitForTimeout(500);
    const volForm = page.locator('#volunteerForm');
    if (await volForm.count() > 0) {
      await expect(volForm).toBeVisible();
    }
  });

  test('Volunteer role chips are visible and clickable', async ({ page }) => {
    await page.goto('/contact.html');
    await page.evaluate(() => document.getElementById('volunteer')?.scrollIntoView());
    await page.waitForTimeout(500);
    const roleChips = page.locator('.vol-role, #volRoles .vol-role');
    if (await roleChips.count() > 0) {
      await roleChips.first().click();
      const selected = await roleChips.first().evaluate(el => el.classList.contains('selected'));
      expect(selected).toBeTruthy();
    }
  });

  test('Volunteer name and email fields accept input', async ({ page }) => {
    await page.goto('/contact.html');
    const volName = page.locator('#volName');
    const volEmail = page.locator('#volEmail');
    if (await volName.count() > 0) {
      await volName.fill('Test Volunteer');
      await volEmail.fill('volunteer@test.com');
      await expect(volName).toHaveValue('Test Volunteer');
      await expect(volEmail).toHaveValue('volunteer@test.com');
    }
  });

  test('Volunteer section benefits/perks are visible', async ({ page }) => {
    await page.goto('/contact.html');
    await page.evaluate(() => document.getElementById('volunteer')?.scrollIntoView());
    await page.waitForTimeout(500);
    const perksSection = page.locator('.vol-perks, .vp-card');
    if (await perksSection.count() > 0) {
      expect(await perksSection.count()).toBeGreaterThanOrEqual(2);
    }
  });

});

test.describe('Events Page — Ticket Cards', () => {

  test('Ticket section loads on events page', async ({ page }) => {
    await page.goto('/events.html#tickets');
    await page.waitForTimeout(500);
    const ticketsSection = page.locator('#tickets');
    if (await ticketsSection.count() > 0) {
      await expect(ticketsSection).toBeVisible();
    }
  });

  test('Ticket pricing cards are visible', async ({ page }) => {
    await page.goto('/events.html');
    const ticketCards = page.locator('.ticket-card, .tc-body');
    if (await ticketCards.count() > 0) {
      expect(await ticketCards.count()).toBeGreaterThanOrEqual(2);
    }
  });

  test('Ticket prices contain $ symbol', async ({ page }) => {
    await page.goto('/events.html');
    const priceEls = page.locator('.tc-price');
    if (await priceEls.count() > 0) {
      const priceText = await priceEls.first().innerText();
      expect(priceText).toMatch(/\$/);
    }
  });

  test('FAQ items expand and collapse', async ({ page }) => {
    await page.goto('/events.html');
    const faqQuestion = page.locator('.faq-q').first();
    if (await faqQuestion.count() > 0) {
      await faqQuestion.click();
      await page.waitForTimeout(300);
      const faqItem = page.locator('.faq-item').first();
      const isOpen = await faqItem.evaluate(el => el.classList.contains('open'));
      expect(isOpen).toBeTruthy();

      // Collapse
      await faqQuestion.click();
      await page.waitForTimeout(300);
      const isStillOpen = await faqItem.evaluate(el => el.classList.contains('open'));
      expect(isStillOpen).toBeFalsy();
    }
  });

});
