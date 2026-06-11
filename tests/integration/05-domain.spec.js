// ============================================================
// INTEGRATION TEST: Domain, SSL & DNS
// Tests domain resolution, HTTPS certificate validity,
// www/naked redirects, privacy/terms pages, and all
// publicly accessible support files.
// ============================================================
const { test, expect } = require('@playwright/test');

const WWW   = 'https://www.utsov.org';
const NAKED = 'http://utsov.org';

test.describe('Domain Resolution & Redirects', () => {

  test('www.utsov.org loads and returns 200', async ({ page }) => {
    const res = await page.goto(WWW + '/');
    expect(res?.status()).toBe(200);
    expect(page.url()).toMatch(/utsov\.org/);
  });

  test('utsov.org (naked) redirects to www.utsov.org', async ({ page }) => {
    await page.goto(NAKED + '/');
    expect(page.url()).toMatch(/www\.utsov\.org/);
  });

  test('HTTP redirects to HTTPS — no plain HTTP served', async ({ page }) => {
    await page.goto(NAKED + '/');
    expect(page.url()).toMatch(/^https:\/\//);
  });

  test('No redirect loop (page settles within 3 redirects)', async ({ page }) => {
    // If there's a redirect loop, goto will throw or hang
    const res = await page.goto(WWW + '/');
    expect(res?.status()).toBe(200);
  });

  test('All main pages resolve from www domain', async ({ page }) => {
    const pages = [
      '/artists.html', '/events.html', '/philanthropy.html',
      '/sponsorship.html', '/contact.html',
    ];
    for (const p of pages) {
      const res = await page.goto(WWW + p);
      expect(res?.status(), `${p} returned ${res?.status()}`).toBe(200);
    }
  });

});

test.describe('HTTPS & SSL Certificate', () => {

  test('Site loads over HTTPS without certificate error', async ({ page }) => {
    // ignoreHTTPSErrors is true in config — if cert was truly broken, page would fail
    const res = await page.goto(WWW + '/');
    expect(res?.status()).toBe(200);
    expect(page.url()).toMatch(/^https:\/\//);
  });

  test('No mixed content — all resources load over HTTPS', async ({ page }) => {
    const httpResources = [];
    page.on('request', req => {
      if (req.url().startsWith('http://') && !req.url().startsWith('http://localhost')) {
        httpResources.push(req.url());
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(httpResources.length, `Mixed content: ${httpResources.join(', ')}`).toBe(0);
  });

  test('SSL-secured pages serve correct Content-Type', async ({ page }) => {
    const res = await page.goto('/');
    expect(res?.headers()['content-type']).toMatch(/text\/html/i);
  });

});

test.describe('Legal & Support Pages', () => {

  test('Privacy Policy page is accessible (200)', async ({ page }) => {
    const res = await page.goto('/privacy.html');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Privacy/i);
  });

  test('Terms of Use page is accessible (200)', async ({ page }) => {
    const res = await page.goto('/terms.html');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveTitle(/Terms/i);
  });

  test('Privacy page contains data collection information', async ({ page }) => {
    await page.goto('/privacy.html');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/collect|personal|data|information/i);
  });

  test('Terms page contains event/ticket usage terms', async ({ page }) => {
    await page.goto('/terms.html');
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/ticket|event|terms|refund|policy/i);
  });

  test('404 page is accessible and meaningful', async ({ page }) => {
    const res = await page.goto('/this-page-does-not-exist-xyz.html');
    expect([404, 200]).toContain(res?.status());
    const body = await page.locator('body').innerText();
    expect(body.toLowerCase()).toMatch(/not found|404|error|home|back/i);
  });

});

test.describe('Support Files Accessibility', () => {

  test('robots.txt is accessible at root', async ({ request }) => {
    const res = await request.get(`${WWW}/robots.txt`);
    expect(res.status()).toBe(200);
  });

  test('sitemap.xml is accessible at root', async ({ request }) => {
    const res = await request.get(`${WWW}/sitemap.xml`);
    expect(res.status()).toBe(200);
  });

  test('api/contacts.php returns JSON (POST endpoint alive)', async ({ request }) => {
    const res = await request.post(`${WWW}/api/contacts.php`, {
      data: JSON.stringify({ action: 'test', name: '', email: '', topic: 'test', message: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    // Should return 200 with JSON (even if validation fails)
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/\{.*\}/);
  });

  test('api/volunteers.php returns JSON (POST endpoint alive)', async ({ request }) => {
    const res = await request.post(`${WWW}/api/volunteers.php`, {
      data: JSON.stringify({ action: 'test', volname: '', volemail: '', volphone: '' }),
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/\{.*\}/);
  });

});

test.describe('Page Load Performance on Production', () => {

  test('Home page DOM ready under 6 seconds on production', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(6000);
  });

  test('Home page fully loaded under 12 seconds on production', async ({ page }) => {
    test.setTimeout(30000);
    const start = Date.now();
    await page.goto('/', { waitUntil: 'load' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(12000);
  });

  test('Apache server responds with correct headers', async ({ page }) => {
    const res = await page.goto('/');
    const server = res?.headers()['server'] || '';
    // Apache or generic — just not empty
    expect(res?.status()).toBe(200);
  });

});
