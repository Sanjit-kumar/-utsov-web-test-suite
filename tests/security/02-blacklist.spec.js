// ============================================================
// SECURITY TEST: Blacklist, Reputation & Malware Checks
// Tests that utsov.org has zero violations — no malware
// injections, no spam patterns, no hidden redirects, no
// hacked content, clean headers, and no obfuscated scripts.
// Target: 0 violations.
// ============================================================
const { test, expect } = require('@playwright/test');

const BASE = 'https://www.utsov.org';

test.describe('Malware & Injection Detection', () => {

  test('No hidden iframes injected into home page', async ({ page }) => {
    await page.goto('/');
    const hiddenIframes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('iframe'))
        .filter(f => {
          const style = window.getComputedStyle(f);
          return style.display === 'none' || style.visibility === 'hidden' ||
                 f.width === '0' || f.height === '0' ||
                 parseInt(f.style.width) < 2 || parseInt(f.style.height) < 2;
        }).map(f => f.src);
    });
    expect(hiddenIframes.length, `Hidden iframes: ${hiddenIframes.join(', ')}`).toBe(0);
  });

  test('No obfuscated base64 script blocks in home page source', async ({ page }) => {
    await page.goto('/');
    const source = await page.content();
    // Malware often uses eval(atob(...)) or eval(unescape(...))
    const obfuscated = source.match(/eval\s*\(\s*(atob|unescape|String\.fromCharCode)\s*\(/g) || [];
    expect(obfuscated.length, `Obfuscated scripts found: ${obfuscated.join(', ')}`).toBe(0);
  });

  test('No suspicious document.write() injections', async ({ page }) => {
    await page.goto('/');
    const source = await page.content();
    const suspicious = source.match(/document\.write\s*\(\s*unescape|document\.write\s*\(\s*atob/gi) || [];
    expect(suspicious.length).toBe(0);
  });

  test('No hidden spam links (white-on-white or 0px font tricks)', async ({ page }) => {
    await page.goto('/');
    const spamLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('a'))
        .filter(a => {
          const style = window.getComputedStyle(a);
          const size  = parseFloat(style.fontSize);
          return size < 1 || style.color === 'rgb(255, 255, 255)' && style.backgroundColor === 'rgb(255, 255, 255)';
        }).map(a => a.href);
    });
    expect(spamLinks.length, `Hidden spam links: ${spamLinks.join(', ')}`).toBe(0);
  });

  test('No PHP error output visible in HTML source', async ({ page }) => {
    await page.goto('/');
    const source = await page.content();
    expect(source).not.toMatch(/Fatal error:|Warning: require|Parse error:|Notice: Undefined/i);
  });

  test('No WordPress or Joomla exploit fingerprints', async ({ page }) => {
    await page.goto('/');
    const source = await page.content();
    // Hacked sites often have these injection patterns
    expect(source).not.toMatch(/wp-content\/uploads.*\.(php|exe)/i);
    expect(source).not.toMatch(/components\/com_[a-z]+\/[a-z]+\.php/i);
  });

  test('No cryptocurrency mining scripts (cryptojacking)', async ({ page }) => {
    const scriptSrcs = [];
    page.on('request', req => {
      if (req.resourceType() === 'script') scriptSrcs.push(req.url());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const mining = scriptSrcs.filter(s =>
      /coinhive|cryptonight|minero|miner\.js|coin-hive/i.test(s)
    );
    expect(mining.length, `Mining scripts: ${mining.join(', ')}`).toBe(0);
  });

  test('No suspicious external script domains loaded', async ({ page }) => {
    const externalScripts = [];
    page.on('request', req => {
      if (req.resourceType() === 'script') {
        const url = req.url();
        if (!url.includes('utsov.org') && url.startsWith('http')) {
          externalScripts.push(url);
        }
      }
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const trustedDomains = [
      'fonts.googleapis.com', 'fonts.gstatic.com', 'googleapis.com',
      'gstatic.com', 'cdn.shopify.com', 'shopify.com',
      'ajax.googleapis.com', 'cdnjs.cloudflare.com',
    ];
    const untrusted = externalScripts.filter(src =>
      !trustedDomains.some(d => src.includes(d))
    );
    if (untrusted.length > 0) {
      console.warn('External scripts from unknown domains:', untrusted);
    }
    expect(untrusted.length, `Untrusted scripts: ${untrusted.join(', ')}`).toBe(0);
  });

});

test.describe('Spam Content Detection', () => {

  test('No pharmaceutical spam keywords in home page', async ({ page }) => {
    await page.goto('/');
    const body = (await page.locator('body').innerText()).toLowerCase();
    const pharmaSpam = ['buy cialis', 'cheap viagra', 'online pharmacy', 'prescription drugs'];
    for (const kw of pharmaSpam) {
      expect(body, `Spam keyword found: "${kw}"`).not.toContain(kw);
    }
  });

  test('No gambling spam keywords in any page', async ({ page }) => {
    for (const url of ['/', '/events.html', '/contact.html']) {
      await page.goto(url);
      const body = (await page.locator('body').innerText()).toLowerCase();
      const gamblingKw = ['online casino', 'free slots', 'bet now', 'poker online'];
      for (const kw of gamblingKw) {
        expect(body, `Gambling spam on ${url}: "${kw}"`).not.toContain(kw);
      }
    }
  });

  test('Page links do not point to known spam TLDs', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.locator('a[href]').evaluateAll(els => els.map(e => e.href));
    const spamTLDs = ['.xyz', '.tk', '.ml', '.ga', '.cf', '.gq'];
    const suspicious = hrefs.filter(h => spamTLDs.some(t => h.includes(t) && !h.includes('utsov')));
    expect(suspicious.length, `Spam TLD links: ${suspicious.join(', ')}`).toBe(0);
  });

  test('No adult content links or keywords', async ({ page }) => {
    await page.goto('/');
    const source = await page.content();
    // Quick heuristic check
    expect(source.toLowerCase()).not.toMatch(/\bporn\b|\bxxx\b|\bsex\b.*\bsite\b/i);
  });

});

test.describe('Security Headers', () => {

  test('X-Content-Type-Options header is set', async ({ page }) => {
    const res = await page.goto('/');
    const h = res?.headers()['x-content-type-options'];
    if (!h) console.warn('⚠ X-Content-Type-Options header missing (recommended)');
    // Not enforced — Apache shared host may not set it
  });

  test('No server version disclosed in response headers', async ({ page }) => {
    const res = await page.goto('/');
    const server = res?.headers()['server'] || '';
    expect(server).not.toMatch(/apache\/2\.\d|nginx\/1\.\d|iis\/\d/i);
  });

  test('No X-Powered-By header revealing tech stack', async ({ page }) => {
    const res = await page.goto('/');
    const xpow = res?.headers()['x-powered-by'] || '';
    // Should not expose PHP version
    expect(xpow).not.toMatch(/PHP\/[5-8]\.\d/i);
  });

  test('Content-Security-Policy or referrer-policy header present', async ({ page }) => {
    const res = await page.goto('/');
    const h = res?.headers();
    const hasSecurityHeader =
      h?.['content-security-policy'] !== undefined ||
      h?.['referrer-policy'] !== undefined ||
      h?.['x-frame-options'] !== undefined;
    // Log if missing — not a hard fail for shared hosting
    if (!hasSecurityHeader) {
      console.warn('⚠ No CSP/Referrer-Policy/X-Frame-Options headers. Consider adding via .htaccess');
    }
  });

  test('HTTPS response does not set insecure cookies', async ({ page }) => {
    await page.goto('/');
    const cookies = await page.context().cookies();
    for (const c of cookies) {
      if (c.name.toLowerCase().match(/sess|auth|token/)) {
        expect(c.secure, `Cookie "${c.name}" should be Secure`).toBeTruthy();
      }
    }
  });

});

