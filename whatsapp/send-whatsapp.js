// ============================================================
// WHATSAPP SENDER — whatsapp-web.js + Playwright Chromium
// Uses your existing WhatsApp account (same as WhatsApp Web).
// First run: opens browser, scan QR with your phone once.
// All subsequent runs: fully silent, no interaction needed.
// ============================================================
'use strict';

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path   = require('path');
const fs     = require('fs');
const dayjs  = require('dayjs');

const WA_PROPS    = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'whatsapp.properties.json'), 'utf8'));
const SESSION_DIR = path.join(__dirname, '..', 'whatsapp-session');
const CHROMIUM    = 'C:\\Users\\sanji\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';

// ── Format WhatsApp message (plain text with WA bold/emoji) ─
function buildWhatsAppMessage(summary) {
  const { totalTests, totalPassed, totalFailed, passRate, overallStatus, failedTests, platforms, allTestTitles } = summary;
  const passed  = totalPassed  ?? summary.passed  ?? 0;
  const failed  = totalFailed  ?? summary.failed  ?? 0;
  const total   = totalTests   ?? (passed + failed);
  const rate    = passRate     ?? 100;
  const now     = dayjs().format('MMM D, YYYY [at] h:mm A');
  const emoji   = failed === 0 ? '✅' : '❌';
  const isLaunchDay = WA_PROPS.launch_day === true;

  let msg = '';

  if (isLaunchDay) {
    msg += `🚀 *utsov.org IS LIVE — Launch Day Test Report*\n`;
  } else {
    msg += `🪔 *UTSOV Website Test Report*\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `${emoji} *${overallStatus}* — ${passed}/${total} tests passed\n`;
  msg += `🌐 utsov.org\n`;
  msg += `🕐 ${now} ET\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  // Per-platform breakdown
  if (platforms && Object.keys(platforms).length > 0) {
    msg += `📊 *Results by Platform*\n`;
    const icons = { Desktop: '🖥️', Android: '🤖', Mac: '🍎' };
    for (const [name, pl] of Object.entries(platforms)) {
      const icon  = icons[name] || '📱';
      const tot   = (pl.passed || 0) + (pl.failed || 0);
      const pRate = tot > 0 ? Math.round((pl.passed / tot) * 100) : 100;
      const st    = pl.failed === 0 ? '✅' : '❌';
      msg += `  ${icon} *${name}:*  ${pl.passed}/${tot}  ${buildBar(pRate)}  ${st}\n`;
    }
    msg += '\n';
  } else {
    msg += `📊 *Overall*\n`;
    msg += `  ✅ Passed:   *${passed}*\n`;
    msg += `  ❌ Failed:   *${failed}*\n`;
    msg += `  📈 Rate:     *${rate}%* ${buildBar(rate)}\n\n`;
  }

  // Failed tests list
  const ft = failedTests || [];
  if (ft.length > 0) {
    msg += `⚠️ *Failed Tests (${ft.length})*\n`;
    const showMax = Math.min(ft.length, 6);
    for (let i = 0; i < showMax; i++) {
      const t = ft[i];
      const platLabel = t.platform ? `[${t.platform}] ` : '';
      msg += `  • ${platLabel}_${t.title}_\n`;
    }
    if (ft.length > showMax) {
      msg += `  _...+${ft.length - showMax} more — see email for full details_\n`;
    }
    msg += '\n';
  }

  if (failed === 0) msg += `🎉 *All platforms passing! Site is healthy.*\n\n`;

  // Launch day: full numbered test case summary
  if (isLaunchDay && allTestTitles && allTestTitles.length > 0) {
    msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `📋 *Complete Test Suite — ${allTestTitles.length} Test Cases*\n\n`;
    allTestTitles.forEach((title, i) => {
      msg += `${i + 1}. ${title}\n`;
    });
    msg += '\n';
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `_UTSOV Durga Puja 2026 · NJ · Oct 17–18_\n`;
  msg += `_Daily tests: Desktop 🖥️ · Android 🤖 · Mac 🍎_`;
  return msg;
}

function buildBar(pct) {
  const total  = 10;
  const filled = Math.round(pct / 10);
  return '▓'.repeat(filled) + '░'.repeat(total - filled);
}

// ── Main send function ────────────────────────────────────────
async function sendWhatsApp(summary) {
  const groups      = WA_PROPS.groups      || [];
  const individuals = WA_PROPS.individuals || [];
  const targets     = [...groups, ...individuals];

  if (targets.length === 0) {
    console.log('⚠️  No WhatsApp groups/individuals configured in whatsapp.properties.json');
    return;
  }

  // Check if send is enabled
  if (summary.failed === 0 && !WA_PROPS.send_on_pass) {
    console.log('ℹ️  WhatsApp: send_on_pass is false — skipping (all tests passed)');
    return;
  }
  if (summary.failed > 0 && !WA_PROPS.send_on_fail) {
    console.log('ℹ️  WhatsApp: send_on_fail is false — skipping');
    return;
  }

  const message = buildWhatsAppMessage(summary);
  console.log('\n📱 Connecting to WhatsApp...');

  return new Promise((resolve, reject) => {
    // LocalAuth saves to SESSION_DIR/session-{clientId}
    let sessionExists = fs.existsSync(path.join(SESSION_DIR, 'session-utsov'));
    if (!sessionExists) {
      console.log('🔷 First-time setup: A browser window will open.');
      console.log('   Scan the QR code with your WhatsApp mobile app.');
      console.log('   This only needs to be done ONCE.\n');
    }

    const client = new Client({
      authStrategy: new LocalAuth({
        clientId: 'utsov',
        dataPath: SESSION_DIR,
      }),
      puppeteer: {
        headless: !sessionExists,   // Show browser for QR scan, headless after
        executablePath: CHROMIUM,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      },
    });

    // QR code in terminal (backup display alongside the browser window)
    client.on('qr', qr => {
      console.log('\n📷 QR Code (also shown in browser window):');
      qrcode.generate(qr, { small: true });
    });

    client.on('loading_screen', (pct, msg) => {
      process.stdout.write(`\r   Loading WhatsApp... ${pct}% ${msg}    `);
    });

    client.on('authenticated', () => {
      console.log('\n🔐 WhatsApp authenticated successfully');
    });

    client.on('auth_failure', msg => {
      console.error('❌ WhatsApp auth failed:', msg);
      // Delete corrupted session
      try { fs.rmSync(path.join(SESSION_DIR, 'wwebjs_auth'), { recursive: true, force: true }); } catch {}
      reject(new Error('Auth failed: ' + msg));
    });

    client.on('ready', async () => {
      // Wait 4 seconds for WhatsApp to fully sync with server before sending.
      // The 'ready' event fires before the WebSocket handshake fully completes —
      // sending immediately causes the message to be silently dropped.
      console.log('\n✅ WhatsApp ready. Syncing with server...');
      await new Promise(r => setTimeout(r, 4000));
      console.log('📤 Sending messages...\n');

      const sentTo = [];
      const errors = [];

      try {
        const chats = await client.getChats();

        for (const target of targets) {
          // Try group by exact name first, then individual by name/number
          const chat =
            chats.find(c => c.isGroup && c.name === target) ||
            chats.find(c => !c.isGroup && (c.name === target || c.id.user === target));

          if (chat) {
            // Use client.sendMessage with chatId for more reliable delivery
            await client.sendMessage(chat.id._serialized, message);
            // Small pause to ensure server acks the message
            await new Promise(r => setTimeout(r, 1500));
            sentTo.push(target);
            console.log(`   ✅ Sent to: ${target}`);
          } else {
            // List available groups so user can update config
            const groupNames = chats.filter(c => c.isGroup).map(c => c.name).join(', ');
            errors.push(target);
            console.warn(`   ⚠️  Group not found: "${target}"`);
            console.warn(`   Available groups: ${groupNames || '(none found)'}`);
          }
        }
      } catch (err) {
        errors.push(err.message);
        console.error('   ❌ Error sending:', err.message);
      } finally {
        await client.destroy();
        if (sentTo.length > 0) {
          console.log(`\n✅ WhatsApp sent to: ${sentTo.join(', ')}`);
          resolve({ sentTo, errors });
        } else {
          reject(new Error('No messages sent. Check group names in whatsapp.properties.json'));
        }
      }
    });

    client.on('disconnected', reason => {
      console.log('WhatsApp disconnected:', reason);
    });

    // Timeout after 3 minutes (QR scan window)
    setTimeout(() => {
      client.destroy().catch(() => {});
      reject(new Error('WhatsApp timed out after 3 minutes'));
    }, 3 * 60 * 1000);

    client.initialize().catch(reject);
  });
}

module.exports = { sendWhatsApp, buildWhatsAppMessage };
