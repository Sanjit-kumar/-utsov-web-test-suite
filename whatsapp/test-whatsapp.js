// ============================================================
// STANDALONE WHATSAPP TEST SENDER
// Run this once to set up the session (QR scan) and verify
// the WhatsApp connection works before the full test suite.
// Usage: node whatsapp/test-whatsapp.js
// ============================================================
'use strict';

const path = require('path');
const fs   = require('fs');
const { buildReport }       = require('../email/build-report');
const { sendWhatsApp }      = require('./send-whatsapp');

const RESULTS_FILE = path.join(__dirname, '..', 'test-results', 'results.json');

async function main() {
  console.log('📱 UTSOV WhatsApp Test Sender');
  console.log('══════════════════════════════\n');

  // Build summary from last test run, or use a mock summary if no results yet
  let summary;
  if (fs.existsSync(RESULTS_FILE)) {
    console.log('📊 Using last test results...');
    const { summary: s } = buildReport(RESULTS_FILE);
    summary = s;
  } else {
    console.log('⚠️  No test results found — sending a sample message instead');
    summary = {
      totalTests: 159, passed: 159, failed: 0, skipped: 0,
      passRate: 100, overallStatus: 'PASSED', failedTests: [],
    };
  }

  console.log(`\nSending WhatsApp for: ${summary.overallStatus} (${summary.passed}/${summary.totalTests})\n`);

  try {
    await sendWhatsApp(summary);
    console.log('\n✅ Done! Check your WhatsApp group.');
  } catch (err) {
    console.error('\n❌ Failed:', err.message);
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Make sure the group name in whatsapp.properties.json matches EXACTLY');
    console.log('   2. Delete whatsapp-session/ folder and re-scan the QR code if auth failed');
    process.exit(1);
  }
}

main();
