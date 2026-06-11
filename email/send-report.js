// ============================================================
// EMAIL SENDER — Local Outlook COM Automation (Windows)
// Uses the signed-in Outlook desktop app directly.
// No SMTP credentials needed. No Basic Auth issues.
// ============================================================
'use strict';

const { execSync } = require('child_process');
const path  = require('path');
const fs    = require('fs');
const dayjs = require('dayjs');
const { buildReport } = require('./build-report');

const RESULTS_PATH = path.join(__dirname, '..', 'test-results', 'results.json');
const EMAIL_PROPS  = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'email.properties.json'), 'utf8'));

async function sendReport() {
  // ── Validate results file ─────────────────────────────────
  if (!fs.existsSync(RESULTS_PATH)) {
    console.error('❌ No results.json found. Run tests first: npm run test:all');
    process.exit(1);
  }

  // ── Build report ──────────────────────────────────────────
  console.log('📊 Building test report...');
  let report;
  try {
    report = buildReport(RESULTS_PATH);
  } catch (err) {
    console.error('❌ Failed to build report:', err.message);
    process.exit(1);
  }

  const { summary } = report;
  const totalFailed = summary.totalFailed ?? summary.failed ?? 0;
  const totalPassed = summary.totalPassed ?? summary.passed ?? 0;
  const totalTests  = summary.totalTests  ?? (totalPassed + totalFailed);
  const statusEmoji = totalFailed === 0 ? '✅' : '❌';
  const runDate     = dayjs().format('MMM D, YYYY h:mm A');
  const subject     = `${statusEmoji} ${EMAIL_PROPS.report.subject_prefix} — ${summary.overallStatus} (${totalPassed}/${totalTests}) — ${runDate}`;
  const recipients  = EMAIL_PROPS.recipients;

  // ── Save HTML report to temp file ────────────────────────
  const tempHtml = path.join(__dirname, '..', 'test-results', '_email_body.html');
  fs.writeFileSync(tempHtml, report.html, 'utf8');

  console.log(`📧 Sending via local Outlook to ${recipients.length} recipient(s)...`);
  console.log(`   Subject: ${subject}`);

  // ── Build PowerShell script ───────────────────────────────
  const toList     = recipients.join('; ');
  const htmlBody   = report.html
    .replace(/`/g, "'")     // escape backticks for PS here-string
    .replace(/\r?\n/g, ' '); // flatten to single line

  // Write a temporary PS1 script to avoid command-line length limits
  const ps1Path = path.join(__dirname, '..', 'test-results', '_send_mail.ps1');
  const ps1Content = `
$htmlBody = Get-Content -Path '${tempHtml.replace(/\\/g, '\\\\')}' -Raw -Encoding UTF8

try {
    $outlook = New-Object -ComObject Outlook.Application
    $mail    = $outlook.CreateItem(0)
    $mail.To = '${toList}'
    $mail.Subject = '${subject.replace(/'/g, "''")}'
    $mail.HTMLBody = $htmlBody
    $mail.Send()
    Write-Host 'SUCCESS: Email sent via Outlook'
    exit 0
} catch {
    Write-Host "ERROR: $_"
    exit 1
}
`;

  fs.writeFileSync(ps1Path, ps1Content, 'utf8');

  // ── Execute via PowerShell ────────────────────────────────
  try {
    const output = execSync(
      `powershell.exe -NonInteractive -ExecutionPolicy Bypass -File "${ps1Path}"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    console.log('   PowerShell output:', output.trim());
    console.log('✅ Email sent successfully via local Outlook!');
    console.log('   Recipients:', toList);
  } catch (err) {
    const msg = err.stdout || err.stderr || err.message;
    console.error('❌ Outlook COM failed:', msg);
    console.log('\n💡 Fallback: HTML report saved locally at:');
    const savedPath = path.join(__dirname, '..', 'test-results', `report-${dayjs().format('YYYY-MM-DD-HHmm')}.html`);
    fs.copyFileSync(tempHtml, savedPath);
    console.log('  ', savedPath);
    console.log('\n   Open it in a browser to view the full report.');
    process.exit(1);
  }

  // ── Also save a permanent copy ────────────────────────────
  const savedPath = path.join(__dirname, '..', 'test-results', `report-${dayjs().format('YYYY-MM-DD-HHmm')}.html`);
  fs.copyFileSync(tempHtml, savedPath);
  console.log('   Report also saved to:', savedPath);

  // ── Cleanup temp files ────────────────────────────────────
  try { fs.unlinkSync(ps1Path); } catch {}
}

sendReport().catch(err => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
