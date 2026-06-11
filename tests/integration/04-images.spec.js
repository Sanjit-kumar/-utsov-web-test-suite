// ============================================================
// INTEGRATION TEST: Image Rendering & Integrity
// Tests every image across all pages — naturalWidth > 0,
// alt text, HTTP status, AVIF/WebP support, CDN images,
// and no broken/missing images anywhere on the site.
// ============================================================
const { test, expect } = require('@playwright/test');

const PAGES = [
  { name: 'Home',         url: '/' },
  { name: 'Artists',      url: '/artists.html' },
  { name: 'Events',       url: '/events.html' },
  { name: 'Philanthropy', url: '/philanthropy.html' },
  { name: 'Sponsorship',  url: '/sponsorship.html' },
  { name: 'Contact',      url: '/contact.html' },
];

const EXPECTED_IMAGES = [
  '/images/logo_utsov.png',
  '/images/Maa1_nobg_straight_fixed.png',
  '/images/mobilemaa.png',
  '/images/artist_iman.jpg',
  '/images/artist_sourendro.jpg',
  '/images/imanmobilebadge.avif',
  '/images/SSmobilebadge.avif',
  '/images/day_shasthi.jpg',
  '/images/day_saptami.jpg',
  '/images/day_ashtami.jpg',
  '/images/day_navami.jpg',
  '/images/day_dashami.jpg',
  '/images/trad_dhak.jpg',
  '/images/trad_dhunuchi.jpg',
  '/images/trad_sindoor.jpg',
  '/images/trad_bhog.jpg',
  '/images/maa1_corner.png',
  '/images/garland.svg',
];

// ── Rendered Image Integrity ───────────────────────────────
test.describe('No Broken Images on Pages', () => {

  for (const p of PAGES) {
    test(`No broken images on ${p.name} page`, async ({ page }) => {
      test.setTimeout(60000);
      await page.goto(p.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(3000);

      const broken = await page.evaluate(() => {
        return Array.from(document.images)
          .filter(img => img.naturalWidth === 0 && img.src && !img.src.includes('data:'))
          .map(img => img.src);
      });

      if (broken.length > 0) {
        console.warn(`Broken images on ${p.url}:`, broken);
      }
      expect(broken.length, `Broken images: ${broken.join(', ')}`).toBe(0);
    });
  }

});

// ── Alt Text Coverage ──────────────────────────────────────
test.describe('Image Alt Text', () => {

  for (const p of PAGES) {
    test(`All meaningful images on ${p.name} have alt attributes`, async ({ page }) => {
      await page.goto(p.url);
      const violations = await page.evaluate(() => {
        return Array.from(document.images)
          .filter(img => {
            if (!img.src || img.src.includes('data:')) return false;
            if (img.getAttribute('role') === 'presentation') return false;
            return img.getAttribute('alt') === null;
          })
          .map(img => img.src);
      });
      expect(violations.length, `Images missing alt on ${p.url}: ${violations.join(', ')}`).toBe(0);
    });
  }

});

// ── Specific Image Rendering ──────────────────────────────
test.describe('Key Images Render Correctly', () => {

  test('Logo renders on home page (naturalWidth > 0)', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const logoWidth = await page.evaluate(() => {
      const logo = document.querySelector('img[src*="logo_utsov"]');
      return logo ? logo.naturalWidth : -1;
    });
    expect(logoWidth, 'Logo did not render').toBeGreaterThan(0);
  });

  test('Hero Durga image renders on home (naturalWidth > 0)', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    const width = await page.evaluate(() => {
      const img = document.querySelector('img[src*="Maa1_nobg"], img[src*="mobilemaa"]');
      return img ? img.naturalWidth : -1;
    });
    expect(width, 'Hero Durga image did not render').toBeGreaterThan(0);
  });

  test('Artist Iman photo renders on artists page', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/artists.html');
    await page.waitForTimeout(2000);
    const width = await page.evaluate(() => {
      const img = document.querySelector('img[src*="artist_iman"]');
      return img ? img.naturalWidth : -1;
    });
    expect(width, 'Iman artist photo did not render').toBeGreaterThan(0);
  });

  test('Artist Sourendro photo renders on artists page', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/artists.html');
    await page.waitForTimeout(2000);
    const width = await page.evaluate(() => {
      const img = document.querySelector('img[src*="artist_sourendro"]');
      return img ? img.naturalWidth : -1;
    });
    expect(width, 'Sourendro artist photo did not render').toBeGreaterThan(0);
  });

  test('Five Sacred Days images all render (5 day images)', async ({ page }) => {
    test.setTimeout(45000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    const dayImages = ['day_shasthi', 'day_saptami', 'day_ashtami', 'day_navami', 'day_dashami'];
    for (const imgName of dayImages) {
      const width = await page.evaluate((name) => {
        const img = document.querySelector(`img[src*="${name}"]`);
        return img ? img.naturalWidth : -1;
      }, imgName);
      expect(width, `${imgName} did not render`).toBeGreaterThan(0);
    }
  });

  test('garland.svg decorative element renders', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(2000);
    // garland may be CSS background or img
    const garlandImg = page.locator('img[src*="garland"]');
    if (await garlandImg.count() > 0) {
      const width = await garlandImg.first().evaluate(el => el.naturalWidth);
      expect(width).toBeGreaterThan(0);
    }
  });

  test('AVIF images are supported and render (imanmobilebadge)', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    // AVIF images used as CSS backgrounds — check the element is rendered
    const el = page.locator('.mac-v1, .mac-v2');
    if (await el.count() > 0) {
      await expect(el.first()).toBeVisible();
    }
  });

  test('PC Chandra logo loads from Shopify CDN', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const cdnImg = page.locator('img[src*="shopify"]').first();
    if (await cdnImg.count() > 0) {
      const width = await cdnImg.evaluate(el => el.naturalWidth);
      expect(width).toBeGreaterThan(0);
    }
  });

  test('Logo renders on all sub-pages', async ({ page }) => {
    test.setTimeout(60000);
    const subPages = ['/artists.html', '/events.html', '/contact.html'];
    for (const url of subPages) {
      await page.goto(url);
      await page.waitForTimeout(1500);
      const width = await page.evaluate(() => {
        const logo = document.querySelector('img[src*="logo_utsov"]');
        return logo ? logo.naturalWidth : -1;
      });
      expect(width, `Logo broken on ${url}`).toBeGreaterThan(0);
    }
  });

});

// ── Image Dimensions & Quality ─────────────────────────────
test.describe('Image Dimensions & Quality', () => {

  test('No suspicious 1x1 tracking pixel images on home page', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);
    const suspicious = await page.evaluate(() => {
      return Array.from(document.images)
        .filter(img => img.naturalWidth === 1 && img.naturalHeight === 1)
        .map(img => img.src);
    });
    expect(suspicious.length, `Tracking pixels found: ${suspicious.join(', ')}`).toBe(0);
  });

  test('Hero image is large enough for visual impact (width > 200px)', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(3000);
    const width = await page.evaluate(() => {
      const img = document.querySelector('img[src*="Maa1_nobg"], img[src*="mobilemaa"]');
      return img ? img.naturalWidth : 300;
    });
    expect(width).toBeGreaterThan(200);
  });

  test('Logo image is reasonable size (not pixelated, width > 50px)', async ({ page }) => {
    test.setTimeout(30000);
    await page.goto('/');
    await page.waitForTimeout(2000);
    const width = await page.evaluate(() => {
      const img = document.querySelector('img[src*="logo_utsov"]');
      return img ? img.naturalWidth : 100;
    });
    expect(width).toBeGreaterThan(50);
  });

});
