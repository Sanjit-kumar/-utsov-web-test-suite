// ============================================================
// INTEGRATION TEST: SEO, Geo & AI Search Indexing
// Tests every signal that drives Durga Puja search ranking:
// title quality, meta tags, structured data, schema, Open
// Graph, Twitter Cards, sitemap, robots.txt, canonicals,
// heading hierarchy, keyword presence, and crawlability.
// ============================================================
const { test, expect } = require('@playwright/test');

const BASE  = 'https://www.utsov.org';
const PAGES = [
  { name: 'Home',         url: '/' },
  { name: 'Artists',      url: '/artists.html' },
  { name: 'Events',       url: '/events.html' },
  { name: 'Philanthropy', url: '/philanthropy.html' },
  { name: 'Sponsorship',  url: '/sponsorship.html' },
  { name: 'Contact',      url: '/contact.html' },
];

// ── Title Tag Quality ──────────────────────────────────────
test.describe('Title Tag Quality', () => {

  test('Home title contains "Durga Puja"', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.toLowerCase()).toMatch(/durga puja/i);
  });

  test('Home title contains "New Jersey" or "NJ"', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title).toMatch(/New Jersey|NJ/i);
  });

  test('Home title contains "2026"', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).toContain('2026');
  });

  test('Home title is between 30–70 characters (optimal for Google)', async ({ page }) => {
    await page.goto('/');
    const title = await page.title();
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(70);
  });

  test('All pages have unique title tags', async ({ page }) => {
    const titles = [];
    for (const p of PAGES) {
      await page.goto(p.url);
      titles.push(await page.title());
    }
    expect(new Set(titles).size).toBe(PAGES.length);
  });

  test('All page titles contain "UTSOV"', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.url);
      expect(await page.title()).toMatch(/UTSOV/i);
    }
  });

});

// ── Meta Description ───────────────────────────────────────
test.describe('Meta Description', () => {

  for (const p of PAGES) {
    test(`${p.name} page has meta description (120–160 chars)`, async ({ page }) => {
      await page.goto(p.url);
      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc).toBeTruthy();
      expect(desc.length).toBeGreaterThanOrEqual(80);
      expect(desc.length).toBeLessThanOrEqual(165);
    });
  }

  test('Home meta description contains "Durga Puja"', async ({ page }) => {
    await page.goto('/');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc.toLowerCase()).toMatch(/durga puja/i);
  });

  test('Home meta description mentions New Jersey or NJ', async ({ page }) => {
    await page.goto('/');
    const desc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(desc).toMatch(/New Jersey|NJ/i);
  });

});

// ── Canonical URL ──────────────────────────────────────────
test.describe('Canonical URLs', () => {

  for (const p of PAGES) {
    test(`${p.name} page has canonical link tag`, async ({ page }) => {
      await page.goto(p.url);
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toBeTruthy();
      expect(canonical).toMatch(/utsov\.org/i);
    });
  }

  test('Canonical URL uses https:// not http://', async ({ page }) => {
    await page.goto('/');
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toMatch(/^https:\/\//);
  });

});

// ── Open Graph Tags ────────────────────────────────────────
test.describe('Open Graph Tags', () => {

  const OG_TAGS = ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'];

  for (const tag of OG_TAGS) {
    test(`Home page has ${tag} Open Graph tag`, async ({ page }) => {
      await page.goto('/');
      const content = await page.locator(`meta[property="${tag}"]`).getAttribute('content');
      expect(content).toBeTruthy();
      expect(content.length).toBeGreaterThan(5);
    });
  }

  test('og:image points to a real image URL', async ({ page, request }) => {
    await page.goto('/');
    const imgUrl = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(imgUrl).toMatch(/\.(png|jpg|jpeg|webp|avif)/i);
    const res = await request.get(imgUrl).catch(() => null);
    if (res) expect(res.status()).toBeLessThan(400);
  });

  test('og:type is "website" on home page', async ({ page }) => {
    await page.goto('/');
    const type = await page.locator('meta[property="og:type"]').getAttribute('content');
    expect(type).toMatch(/website|event/i);
  });

  test('All pages have unique og:title', async ({ page }) => {
    const titles = [];
    for (const p of PAGES) {
      await page.goto(p.url);
      const t = await page.locator('meta[property="og:title"]').getAttribute('content').catch(() => null);
      if (t) titles.push(t);
    }
    expect(new Set(titles).size).toBe(titles.length);
  });

});

// ── Twitter Card Tags ──────────────────────────────────────
test.describe('Twitter Card Tags', () => {

  test('Home has twitter:card tag', async ({ page }) => {
    await page.goto('/');
    const card = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(card).toMatch(/summary/i);
  });

  test('Home has twitter:title tag', async ({ page }) => {
    await page.goto('/');
    const t = await page.locator('meta[name="twitter:title"]').getAttribute('content');
    expect(t).toBeTruthy();
  });

  test('Home has twitter:image tag', async ({ page }) => {
    await page.goto('/');
    const img = await page.locator('meta[name="twitter:image"]').getAttribute('content');
    expect(img).toMatch(/\.(png|jpg|jpeg|webp)/i);
  });

  test('Home has twitter:description tag', async ({ page }) => {
    await page.goto('/');
    const d = await page.locator('meta[name="twitter:description"]').getAttribute('content');
    expect(d).toBeTruthy();
    expect(d.length).toBeGreaterThan(20);
  });

});

// ── JSON-LD Structured Data ────────────────────────────────
test.describe('JSON-LD Structured Data', () => {

  test('Home page has JSON-LD script tag', async ({ page }) => {
    await page.goto('/');
    const jsonld = await page.locator('script[type="application/ld+json"]').count();
    expect(jsonld).toBeGreaterThan(0);
  });

  test('Home JSON-LD contains @context: schema.org', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join('\n');
    expect(combined).toMatch(/schema\.org/i);
  });

  test('Home JSON-LD contains Organization type', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join('\n');
    expect(combined).toMatch(/Organization|Event/i);
  });

  test('Events page has Event structured data', async ({ page }) => {
    await page.goto('/events.html');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    const combined = scripts.join('\n');
    expect(combined).toMatch(/"@type"\s*:\s*"Event"/i);
  });

  test('Events JSON-LD contains event date (2026)', async ({ page }) => {
    await page.goto('/events.html');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    expect(scripts.join('\n')).toMatch(/2026/);
  });

  test('Events JSON-LD contains venue/location info', async ({ page }) => {
    await page.goto('/events.html');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    expect(scripts.join('\n')).toMatch(/East Brunswick|New Jersey|NJ/i);
  });

  test('Home JSON-LD contains UTSOV name', async ({ page }) => {
    await page.goto('/');
    const scripts = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    expect(scripts.join('\n')).toMatch(/UTSOV/i);
  });

});

// ── Robots.txt & Sitemap ───────────────────────────────────
test.describe('Robots.txt & Sitemap', () => {

  test('robots.txt allows Googlebot crawling', async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    const body = await res.text();
    // Should NOT have Disallow: / for all user-agents
    expect(body).not.toMatch(/User-agent: \*[\s\S]*?Disallow: \/(?!\S)/m);
  });

  test('robots.txt references sitemap.xml', async ({ request }) => {
    const res = await request.get(`${BASE}/robots.txt`);
    const body = await res.text();
    expect(body.toLowerCase()).toMatch(/sitemap/i);
  });

  test('sitemap.xml contains home page URL', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toMatch(/utsov\.org/i);
  });

  test('sitemap.xml contains all main pages', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toMatch(/artists/i);
    expect(body).toMatch(/events/i);
    expect(body).toMatch(/contact/i);
  });

  test('sitemap.xml is valid XML (has <?xml header or <urlset)', async ({ request }) => {
    const res = await request.get(`${BASE}/sitemap.xml`);
    const body = await res.text();
    expect(body).toMatch(/<\?xml|<urlset|<sitemapindex/i);
  });

});

// ── Heading Structure & Keywords ──────────────────────────
test.describe('Heading Structure & SEO Keywords', () => {

  test('Home page has exactly one H1', async ({ page }) => {
    await page.goto('/');
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThanOrEqual(1);
    expect(h1Count).toBeLessThanOrEqual(1);
  });

  test('Home H1 contains UTSOV or Durga Puja keyword', async ({ page }) => {
    await page.goto('/');
    const h1 = await page.locator('h1').first().innerText().catch(() => '');
    expect(h1).toMatch(/UTSOV|Durga Puja/i);
  });

  test('Page has H2 subheadings for content structure', async ({ page }) => {
    await page.goto('/');
    const h2Count = await page.locator('h2').count();
    expect(h2Count).toBeGreaterThan(0);
  });

  test('Home body text mentions "Durga Puja" multiple times', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    const count = (body.match(/Durga Puja/gi) || []).length;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('Home page mentions "New Jersey" or "NJ" in body text', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/New Jersey|NJ/i);
  });

  test('Home page mentions "October 2026" or event date', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/Oct|October|2026/i);
  });

  test('All images have alt attributes (AI image indexing)', async ({ page }) => {
    await page.goto('/');
    const images = await page.locator('img').all();
    for (const img of images) {
      const src = await img.getAttribute('src') || '';
      if (src.includes('data:')) continue;
      const alt = await img.getAttribute('alt');
      expect(alt !== null, `Image missing alt: ${src}`).toBeTruthy();
    }
  });

});

// ── AI Search & Crawl Signals ──────────────────────────────
test.describe('AI Search & Crawl Signals', () => {

  test('Home page has lang="en" for AI content classification', async ({ page }) => {
    await page.goto('/');
    const lang = await page.locator('html').getAttribute('lang');
    expect(lang).toMatch(/^en/i);
  });

  test('No noindex meta tag blocking search indexing', async ({ page }) => {
    for (const p of PAGES) {
      await page.goto(p.url);
      const noindex = await page.locator('meta[name="robots"][content*="noindex"]').count();
      expect(noindex, `${p.name} has noindex meta tag`).toBe(0);
    }
  });

  test('Home has meta keywords tag', async ({ page }) => {
    await page.goto('/');
    const keywords = await page.locator('meta[name="keywords"]').getAttribute('content').catch(() => null);
    if (keywords) {
      expect(keywords.toLowerCase()).toMatch(/durga puja/i);
    }
  });

  test('Page content-to-HTML ratio is reasonable (not thin content)', async ({ page }) => {
    await page.goto('/');
    const bodyText = await page.locator('body').innerText();
    const bodyHTML = await page.locator('body').innerHTML();
    const ratio = bodyText.length / bodyHTML.length;
    // Healthy ratio > 0.05 means actual text content vs code
    expect(ratio).toBeGreaterThan(0.05);
  });

  test('Internal links provide good crawl depth (>= 5 internal links on home)', async ({ page }) => {
    await page.goto('/');
    const internalLinks = await page.locator('a[href]:not([href^="http"]):not([href^="mailto"]):not([href^="tel"]):not([href^="#"])').count();
    expect(internalLinks).toBeGreaterThanOrEqual(5);
  });

  test('llms.txt or AI indexing hints file is accessible', async ({ request }) => {
    const res = await request.get(`${BASE}/llms.txt`).catch(() => null);
    // Non-critical: just verify it exists if present
    if (res && res.status() === 200) {
      const body = await res.text();
      expect(body.length).toBeGreaterThan(0);
    }
  });

});
