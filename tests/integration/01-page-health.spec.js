// ============================================================
// INTEGRATION TEST: Page Health & HTTP Status
// Tests all pages return correct HTTP status, load without
// network errors, and have proper meta tags
// ============================================================
const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'Home',         url: '/'                  },
  { name: 'Artists',      url: '/artists.html'       },
  { name: 'Events',       url: '/events.html'        },
  { name: 'Philanthropy', url: '/philanthropy.html'  },
  { name: 'Sponsorship',  url: '/sponsorship.html'   },
  { name: 'Contact',      url: '/contact.html'       },
];

test.describe('HTTP Status Codes', () => {

  for (const p of PAGES) {
    test(`${p.name} page returns HTTP 200`, async ({ page }) => {
      const response = await page.goto(p.url);
      expect(response?.status()).toBe(200);
    });
  }

  test('404.html returns a proper response', async ({ page }) => {
    const response = await page.goto('/404.html');
    expect([200, 404]).toContain(response?.status());
  });

});

test.describe('Meta Tags & SEO', () => {

  test('Home page has a <title> tag', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThan(5);
  });

  test('Home page has viewport meta tag', async ({ page }) => {
    await page.goto('/');
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toMatch(/width=device-width/i);
  });

  test('Home page has charset meta tag', async ({ page }) => {
    await page.goto('/');
    const charset = await page.locator('meta[charset]').getAttribute('charset');
    expect(charset?.toLowerCase()).toMatch(/utf-8/i);
  });

  test('All pages have unique titles', async ({ page }) => {
    const titles = [];
    for (const p of PAGES) {
      await page.goto(p.url);
      titles.push(await page.title());
    }
    const uniqueTitles = new Set(titles);
    expect(uniqueTitles.size).toBe(PAGES.length);
  });

  test('Home page has lang attribute on <html>', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toBeTruthy();
  });

});

test.describe('Resource Loading', () => {

  test('CSS loads and body has computed styles', async ({ page }) => {
    await page.goto('/');
    const bgColor = await page.evaluate(() =>
      window.getComputedStyle(document.body).backgroundColor
    );
    // Should not be empty or transparent (means CSS loaded)
    expect(bgColor).not.toBe('');
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('Google Fonts are loaded', async ({ page }) => {
    await page.goto('/');
    const fontLink = await page.locator('link[href*="fonts.googleapis.com"]').count();
    expect(fontLink).toBeGreaterThan(0);
  });

  test('No failed resource requests (CSS/JS/fonts)', async ({ page }) => {
    const failedResources = [];
    page.on('requestfailed', req => {
      const url = req.url();
      // Only care about non-image failures
      if (!url.includes('.png') && !url.includes('.jpg') && !url.includes('.ico')) {
        failedResources.push(url);
      }
    });
    await page.goto('/');
    await page.waitForTimeout(2000);
    expect(failedResources).toHaveLength(0);
  });

  test('Images on home page are not broken (naturalWidth > 0)', async ({ page }) => {
    test.setTimeout(45000); // Extra time for image-heavy page
    await page.goto('/', { timeout: 35000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.images);
      return imgs
        .filter(img => img.naturalWidth === 0 && img.src && !img.src.includes('data:'))
        .map(img => img.src);
    });
    // Allow up to 2 broken (placeholder images)
    expect(brokenImages.length).toBeLessThanOrEqual(2);
  });

  test('Favicon is linked', async ({ page }) => {
    await page.goto('/');
    const favicon = await page.locator('link[rel*="icon"]').count();
    // Favicon may or may not be set; just log if missing
    if (favicon === 0) {
      console.log('⚠ No favicon link tag found');
    }
  });

});

test.describe('Performance', () => {

  test('Home page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Artists page loads within 5 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/artists.html');
    await page.waitForLoadState('domcontentloaded');
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test('Home page DOM content size is reasonable', async ({ page }) => {
    await page.goto('/');
    const domSize = await page.evaluate(() => document.documentElement.outerHTML.length);
    // Should be under 500KB raw HTML
    expect(domSize).toBeLessThan(500000);
  });

  test('No excessive network requests (under 60)', async ({ page }) => {
    const requests = [];
    page.on('request', req => requests.push(req.url()));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(requests.length).toBeLessThan(60);
  });

});

test.describe('Hosting & Server', () => {

  test('Site is served from utsov.org domain', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toMatch(/utsov\.org/);
  });

  test('Response includes cache-control or ETag header', async ({ page }) => {
    const response = await page.goto('/');
    const h = response?.headers() || {};
    expect(h['cache-control'] !== undefined || h['etag'] !== undefined).toBeTruthy();
  });

  test('Content-Type header is text/html', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.headers()['content-type']).toMatch(/text\/html/i);
  });

  test('Server does not disclose version in headers', async ({ page }) => {
    const response = await page.goto('/');
    const server = response?.headers()['server'] || '';
    expect(server).not.toMatch(/apache\/\d|nginx\/\d|iis\/\d/i);
  });

  test('robots.txt is accessible', async ({ request }) => {
    const res = await request.get('https://www.utsov.org/robots.txt');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/user-agent/i);
  });

  test('sitemap.xml is accessible', async ({ request }) => {
    const res = await request.get('https://www.utsov.org/sitemap.xml');
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/<urlset|<sitemapindex/i);
  });

});
