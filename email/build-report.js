// ============================================================
// HTML EMAIL REPORT BUILDER — with per-platform breakdown
// Parses Playwright JSON results and builds a branded HTML
// email showing Desktop / Android / iOS results separately
// ============================================================
'use strict';

const fs    = require('fs');
const dayjs = require('dayjs');

const PLATFORM_META = {
  'Desktop': { emoji: '🖥️', label: 'Desktop',  color: '#1d4ed8', bg: '#eff6ff' },
  'Android': { emoji: '🤖', label: 'Android',  color: '#16a34a', bg: '#f0fdf4' },
  'Mac':     { emoji: '🍎', label: 'Mac',       color: '#7c3aed', bg: '#faf5ff' },
};

function buildReport(resultsPath) {
  const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  // ── Collect all projects present in results ───────────────
  const projectNames = new Set();
  function collectProjects(suite) {
    for (const s of (suite.suites || [])) collectProjects(s);
    for (const spec of (suite.specs || [])) {
      for (const t of (spec.tests || [])) {
        if (t.projectName) projectNames.add(t.projectName);
      }
    }
  }
  for (const s of (results.suites || [])) collectProjects(s);

  // ── Per-platform counters ─────────────────────────────────
  const platforms = {};
  for (const name of projectNames) {
    platforms[name] = { passed: 0, failed: 0, skipped: 0, failedTests: [], suites: [] };
  }

  // ── Parse spec results per project ───────────────────────
  function parseSpec(spec, suiteName, filePath) {
    for (const test of (spec.tests || [])) {
      const proj = test.projectName;
      if (!proj || !platforms[proj]) continue;

      const lastResult = test.results?.[test.results.length - 1];
      const retry      = (test.results?.length || 0) > 1;
      // Use spec.ok if test matches overall pass — flaky = spec.ok true even if first result failed
      const allResults = test.results || [];
      const anyPassed  = allResults.some(r => r.status === 'passed');
      const status     = spec.ok && anyPassed ? 'passed' : (lastResult?.status || 'failed');
      const duration   = lastResult?.duration || 0;

      if (status === 'passed')      platforms[proj].passed++;
      else if (status === 'failed' || status === 'timedOut') {
        platforms[proj].failed++;
        const err = lastResult?.errors?.[0]?.message || 'Test failed';
        platforms[proj].failedTests.push({ title: spec.title, suite: suiteName, error: err.substring(0, 220) });
      } else if (status === 'skipped') platforms[proj].skipped++;

      // Group into suites per platform
      let suiteEntry = platforms[proj].suites.find(s => s.name === suiteName && s.file === filePath);
      if (!suiteEntry) {
        suiteEntry = { name: suiteName, file: filePath, tests: [] };
        platforms[proj].suites.push(suiteEntry);
      }
      suiteEntry.tests.push({ title: spec.title, status, duration, retry });
    }
  }

  function walkSuite(suite, parentFile) {
    const file = suite.file || parentFile || suite.title || '';
    for (const sub of (suite.suites || [])) {
      walkSuite({ ...sub, file: sub.file || file }, file);
    }
    for (const spec of (suite.specs || [])) {
      parseSpec(spec, suite.title || file, file);
    }
  }
  for (const s of (results.suites || [])) walkSuite(s, '');

  // ── Overall totals ────────────────────────────────────────
  const allNames = Object.keys(platforms);
  let totalTests = 0, totalPassed = 0, totalFailed = 0, totalSkipped = 0;
  const allFailed = [];
  for (const p of allNames) {
    const pl = platforms[p];
    totalPassed  += pl.passed;
    totalFailed  += pl.failed;
    totalSkipped += pl.skipped;
    totalTests   += pl.passed + pl.failed + pl.skipped;
    pl.failedTests.forEach(t => allFailed.push({ ...t, platform: p }));
  }

  const passRate      = totalTests > 0 ? Math.round((totalPassed / totalTests) * 100) : 100;
  const totalDuration = results.stats?.duration || 0;

  // ── Collect unique test titles for launch-day WhatsApp ────
  const seenTitles = new Set();
  const allTestTitles = [];
  const firstPlatform = allNames[0];
  if (firstPlatform) {
    for (const suite of (platforms[firstPlatform]?.suites || [])) {
      for (const t of suite.tests) {
        if (!seenTitles.has(t.title)) { seenTitles.add(t.title); allTestTitles.push(t.title); }
      }
    }
  }
  const runDate       = dayjs().format('MMMM D, YYYY [at] h:mm A [ET]');
  const overallStatus = totalFailed === 0 ? 'PASSED' : 'FAILED';
  const statusColor   = totalFailed === 0 ? '#16a34a' : '#dc2626';
  const statusBg      = totalFailed === 0 ? '#dcfce7' : '#fee2e2';
  const statusEmoji   = totalFailed === 0 ? '✅' : '❌';

  // ── Helpers ───────────────────────────────────────────────
  const badge = s => ({
    passed:  '<span style="display:inline-block;padding:2px 9px;background:#dcfce7;color:#166534;border-radius:20px;font-size:11px;font-weight:700">PASS</span>',
    failed:  '<span style="display:inline-block;padding:2px 9px;background:#fee2e2;color:#991b1b;border-radius:20px;font-size:11px;font-weight:700">FAIL</span>',
    timedOut:'<span style="display:inline-block;padding:2px 9px;background:#fef3c7;color:#92400e;border-radius:20px;font-size:11px;font-weight:700">TIMEOUT</span>',
    skipped: '<span style="display:inline-block;padding:2px 9px;background:#f3f4f6;color:#6b7280;border-radius:20px;font-size:11px;font-weight:700">SKIP</span>',
  }[s] || `<span style="background:#e5e7eb;padding:2px 9px;border-radius:20px;font-size:11px">${s}</span>`);

  const dur = ms => !ms ? '—' : ms < 1000 ? `${ms}ms` : `${(ms/1000).toFixed(1)}s`;

  function renderSuiteTable(suites, accent) {
    if (!suites.length) return '<p style="color:#9ca3af;font-size:13px;padding:6px 0">No tests in this category.</p>';
    return suites.map(suite => {
      const suitePass = suite.tests.filter(t => t.status === 'passed').length;
      const suiteFail = suite.tests.length - suitePass;
      return `
        <div style="margin-bottom:22px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid ${accent}25">
            <div style="width:3px;height:20px;background:${accent};border-radius:2px;flex-shrink:0"></div>
            <span style="font-size:12px;font-weight:700;color:#1f2937;font-family:monospace">${suite.name}</span>
            <span style="margin-left:auto;font-size:11px;color:#6b7280">${suitePass}/${suite.tests.length}</span>
            ${suiteFail > 0 ? `<span style="font-size:11px;color:#dc2626;font-weight:700">${suiteFail} ✗</span>` : '<span style="font-size:11px;color:#16a34a;font-weight:700">✓ All</span>'}
          </div>
          <table style="width:100%;border-collapse:collapse">
            <thead><tr style="background:#f9fafb">
              <th style="text-align:left;padding:6px 10px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Test</th>
              <th style="text-align:center;padding:6px 10px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;width:75px">Status</th>
              <th style="text-align:right;padding:6px 10px;font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb;width:60px">Time</th>
            </tr></thead>
            <tbody>${suite.tests.map(t => `
              <tr style="background:${t.status==='failed'||t.status==='timedOut'?'#fff5f5':'white'};border-bottom:1px solid #f3f4f6">
                <td style="padding:7px 10px;font-size:11px;color:#374151">${t.retry ? '🔄 ' : ''}${t.title}</td>
                <td style="padding:7px 10px;text-align:center">${badge(t.status)}</td>
                <td style="padding:7px 10px;text-align:right;font-size:10px;color:#9ca3af">${dur(t.duration)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }).join('');
  }

  function renderPlatformSection(projName) {
    const pl   = platforms[projName];
    const meta = PLATFORM_META[projName] || { emoji: '📱', label: projName, color: '#6b7280', bg: '#f9fafb' };
    const plTotal  = pl.passed + pl.failed + pl.skipped;
    const plRate   = plTotal > 0 ? Math.round((pl.passed / plTotal) * 100) : 100;
    const plStatus = pl.failed === 0 ? '✅' : '❌';

    // Categorise suites
    function catSuites(arr) {
      const cats = { functional: [], integration: [], security: [] };
      for (const s of arr) {
        const f = s.file.toLowerCase();
        if      (f.includes('functional'))  cats.functional.push(s);
        else if (f.includes('integration')) cats.integration.push(s);
        else if (f.includes('security'))    cats.security.push(s);
      }
      return cats;
    }
    const cats = catSuites(pl.suites);

    return `
      <tr><td style="background:white;padding:28px 40px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">

        <!-- Platform header -->
        <div style="background:${meta.bg};border:1.5px solid ${meta.color}30;border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;align-items:center;gap:14px">
          <div style="font-size:28px">${meta.emoji}</div>
          <div style="flex:1">
            <div style="font-size:16px;font-weight:800;color:${meta.color}">${meta.label}</div>
            <div style="font-size:12px;color:#6b7280;margin-top:2px">${pl.passed} passed · ${pl.failed} failed · ${plRate}% pass rate</div>
          </div>
          <div style="font-size:24px">${plStatus}</div>
          <!-- Mini bar -->
          <div style="width:120px">
            <div style="background:#e5e7eb;border-radius:99px;height:6px;overflow:hidden">
              <div style="background:${plRate===100?'#16a34a':plRate>=80?'#ca8a04':'#dc2626'};height:6px;width:${plRate}%;border-radius:99px"></div>
            </div>
            <div style="font-size:11px;font-weight:700;color:${meta.color};text-align:right;margin-top:3px">${plRate}%</div>
          </div>
        </div>

        ${pl.failed > 0 ? `
        <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;margin-bottom:16px">
          <div style="font-size:12px;font-weight:700;color:#991b1b;margin-bottom:8px">❌ ${pl.failedTests.length} Failed on ${meta.label}</div>
          ${pl.failedTests.map(t => `
            <div style="background:white;border:1px solid #fca5a5;border-radius:6px;padding:8px 10px;margin-bottom:6px">
              <div style="font-size:11px;font-weight:700;color:#991b1b;margin-bottom:2px">${t.title}</div>
              <div style="font-size:10px;color:#6b7280;font-family:monospace">${t.suite}</div>
            </div>`).join('')}
        </div>` : ''}

        ${cats.functional.length ? `
        <div style="margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <span>🖱️ Functional</span>
            <span style="font-size:11px;font-weight:400;color:#9ca3af">— Navigation · Forms · Scroll · Responsive</span>
          </div>
          ${renderSuiteTable(cats.functional, meta.color)}
        </div>` : ''}

        ${cats.integration.length ? `
        <div style="margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <span>🔗 Integration</span>
            <span style="font-size:11px;font-weight:400;color:#9ca3af">— HTTP · Links · Resources · SEO</span>
          </div>
          ${renderSuiteTable(cats.integration, meta.color)}
        </div>` : ''}

        ${cats.security.length ? `
        <div style="margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;display:flex;align-items:center;gap:6px">
            <span>🔒 Security</span>
            <span style="font-size:11px;font-weight:400;color:#9ca3af">— HTTPS · Headers · XSS</span>
          </div>
          ${renderSuiteTable(cats.security, meta.color)}
        </div>` : ''}

      </td></tr>
      <tr><td style="background:#f8fafc;height:1px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb"></td></tr>
    `;
  }

  // ── Build full HTML ───────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>UTSOV Test Report — ${runDate}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 16px">
<tr><td align="center">
<table width="700" cellpadding="0" cellspacing="0" style="max-width:700px;width:100%">

  <!-- HEADER -->
  <tr><td style="background:linear-gradient(135deg,#5C0000,#8B1A1A,#A52020);border-radius:14px 14px 0 0;padding:32px 40px;text-align:center">
    <div style="font-size:32px;margin-bottom:8px">🪔</div>
    <h1 style="margin:0;font-size:24px;font-weight:800;color:white">UTSOV Website Test Report</h1>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,.6);letter-spacing:.06em;text-transform:uppercase">${runDate}</p>
    <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,.4)">🌐 https://utsov2.web.app</p>
  </td></tr>

  <!-- OVERALL STATUS -->
  <tr><td style="background:white;padding:28px 40px 20px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
    <div style="background:${statusBg};border:2px solid ${statusColor}30;border-radius:12px;padding:16px 24px;text-align:center;margin-bottom:22px">
      <div style="font-size:30px;margin-bottom:5px">${statusEmoji}</div>
      <div style="font-size:20px;font-weight:800;color:${statusColor}">${overallStatus} — ${totalPassed}/${totalTests}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:3px">${passRate}% overall pass rate · ${(totalDuration/1000).toFixed(0)}s runtime</div>
    </div>

    <!-- Platform summary grid -->
    <div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px">📊 Results by Platform</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <thead><tr style="background:#f9fafb">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Platform</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Passed</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Failed</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Rate</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb">Status</th>
        </tr></thead>
        <tbody>
          ${allNames.map(name => {
            const pl   = platforms[name];
            const meta = PLATFORM_META[name] || { emoji: '📱', label: name, color: '#6b7280' };
            const tot  = pl.passed + pl.failed + pl.skipped;
            const rate = tot > 0 ? Math.round((pl.passed/tot)*100) : 100;
            return `<tr style="border-bottom:1px solid #f3f4f6">
              <td style="padding:10px 12px;font-size:13px;font-weight:700;color:${meta.color}">${meta.emoji} ${meta.label}</td>
              <td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:700;color:#16a34a">${pl.passed}</td>
              <td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:700;color:${pl.failed>0?'#dc2626':'#9ca3af'}">${pl.failed}</td>
              <td style="padding:10px 12px;text-align:center">
                <div style="background:#e5e7eb;border-radius:99px;height:6px;overflow:hidden;margin-bottom:2px">
                  <div style="background:${rate===100?'#16a34a':rate>=80?'#ca8a04':'#dc2626'};height:6px;width:${rate}%;border-radius:99px"></div>
                </div>
                <span style="font-size:11px;font-weight:700;color:${meta.color}">${rate}%</span>
              </td>
              <td style="padding:10px 12px;text-align:center;font-size:18px">${pl.failed===0?'✅':'❌'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Overall pass rate bar -->
    <div>
      <div style="display:flex;justify-content:space-between;margin-bottom:5px">
        <span style="font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.05em">Overall Pass Rate</span>
        <span style="font-size:11px;font-weight:800;color:${statusColor}">${passRate}%</span>
      </div>
      <div style="background:#e5e7eb;border-radius:99px;height:8px;overflow:hidden">
        <div style="background:${passRate===100?'#16a34a':passRate>=80?'#ca8a04':'#dc2626'};height:8px;width:${passRate}%;border-radius:99px"></div>
      </div>
    </div>
  </td></tr>

  <!-- PER-PLATFORM DETAILED RESULTS -->
  ${allNames.map(name => renderPlatformSection(name)).join('')}

  <!-- FOOTER -->
  <tr><td style="background:linear-gradient(135deg,#5C0000,#8B1A1A);border-radius:0 0 14px 14px;padding:22px 40px;text-align:center">
    <p style="margin:0 0 6px;font-size:12px;color:rgba(255,255,255,.65)">🪔 UTSOV Durga Puja 2026 · Jo Ann Magistro PAC, East Brunswick NJ · Oct 17–18</p>
    <p style="margin:0;font-size:10px;color:rgba(255,255,255,.35)">Automated tests run daily at 8:00 AM &amp; 11:00 PM ET across Desktop · Android · iOS · Do not reply</p>
  </td></tr>

</table></td></tr></table>
</body></html>`;

  return {
    html,
    summary: {
      totalTests, totalPassed, totalFailed, totalSkipped,
      passRate, overallStatus,
      failedTests: allFailed,
      platforms,
      allTestTitles,
    }
  };
}

module.exports = { buildReport };
