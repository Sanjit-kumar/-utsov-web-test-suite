// ============================================================
// MASTER TEST RUNNER
// Runs all test suites, generates report, sends email + WhatsApp
// Usage: node run-tests.js
// ============================================================
'use strict';

const { execSync, spawn } = require('child_process');
const path  = require('path');
const fs    = require('fs');
const dayjs = require('dayjs');

const ROOT         = __dirname;
const RESULTS_DIR  = path.join(ROOT, 'test-results');
const RESULTS_FILE = path.join(RESULTS_DIR, 'results.json');

// ── Ensure results dir exists ─────────────────────────────
if (!fs.existsSync(RESULTS_DIR)) {
  fs.mkdirSync(RESULTS_DIR, { recursive: true });
}

function log(msg)  { console.log(`[${dayjs().format('HH:mm:ss')}] ${msg}`); }
function logOk(m)  { console.log(`[${dayjs().format('HH:mm:ss')}] ✅ ${m}`); }
function logErr(m) { console.error(`[${dayjs().format('HH:mm:ss')}] ❌ ${m}`); }
function logWarn(m){ console.warn(`[${dayjs().format('HH:mm:ss')}] ⚠️  ${m}`); }

async function main() {
  const startTime = Date.now();

  log('═══════════════════════════════════════════════════');
  log('   UTSOV Website Test Suite — Starting Run');
  log(`   Target: https://www.utsov.org`);
  log(`   Date:   ${dayjs().format('MMMM D, YYYY h:mm A')}`);
  log('═══════════════════════════════════════════════════');

  // ── Step 1: Run Playwright tests ─────────────────────────
  log('\n📋 Running all tests (Functional + Integration + Security)...\n');

  let testExitCode = 0;
  try {
    execSync(
      `npx playwright test --reporter=json,list --output="${RESULTS_DIR}/artifacts"`,
      {
        cwd: ROOT,
        stdio: 'inherit',
        env: { ...process.env },
      }
    );
    logOk('All tests completed');
  } catch (err) {
    testExitCode = err.status || 1;
    logWarn(`Tests finished with ${testExitCode} failure(s) — proceeding to report`);
  }

  // ── Step 2: Verify results.json was generated ─────────────
  // Playwright writes to the path set in config reporter
  // Check if it exists; if not, create a minimal one
  if (!fs.existsSync(RESULTS_FILE)) {
    logWarn('results.json not found — checking alternate locations...');
    // Playwright sometimes writes to cwd
    const altPath = path.join(ROOT, 'results.json');
    if (fs.existsSync(altPath)) {
      fs.copyFileSync(altPath, RESULTS_FILE);
      logOk('Found results.json in root, copied to test-results/');
    } else {
      logErr('Cannot find results.json. Creating empty stub.');
      fs.writeFileSync(RESULTS_FILE, JSON.stringify({
        suites: [], stats: { duration: Date.now() - startTime, expected: 0, unexpected: 0, flaky: 0, skipped: 0 }
      }));
    }
  }

  // ── Step 3: Send email report ─────────────────────────────
  log('\n📧 Building and sending email report...\n');
  let reportSummary = null;
  try {
    // Build summary from results for WhatsApp (reuse build-report logic)
    const { buildReport } = require('./email/build-report');
    const built = buildReport(RESULTS_FILE);
    reportSummary = built.summary;

    execSync(`node "${path.join(ROOT, 'email', 'send-report.js')}"`, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env },
    });
    logOk('Email report sent!');
  } catch (err) {
    logErr('Failed to send email report: ' + err.message);
  }

  // ── Step 4: Send WhatsApp message ─────────────────────────
  log('\n📱 Sending WhatsApp message...\n');
  if (reportSummary) {
    try {
      const { sendWhatsApp } = require('./whatsapp/send-whatsapp');
      await sendWhatsApp(reportSummary);
    } catch (err) {
      logErr('WhatsApp send failed: ' + err.message);
      log('   (Email was still sent — WhatsApp is optional)');
    }
  } else {
    logWarn('Skipping WhatsApp — could not read test summary');
  }

  // ── Summary ───────────────────────────────────────────────
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  log('\n═══════════════════════════════════════════════════');
  log(`   Run complete in ${totalTime}s`);
  log('═══════════════════════════════════════════════════\n');

  process.exit(testExitCode > 0 ? 1 : 0);
}

main().catch(err => {
  logErr('Unexpected error: ' + err.message);
  process.exit(1);
});
