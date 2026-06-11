// ============================================================
// ONE-TIME SETUP: Scan QR code and save WhatsApp session
// Run this script, scan the QR code in the browser window,
// then wait for "SESSION SAVED" before closing.
// ============================================================
'use strict';

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const path   = require('path');
const fs     = require('fs');

const SESSION_DIR = path.join(__dirname, '..', 'whatsapp-session');
const TARGET      = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'whatsapp.properties.json'))).groups[0];

console.log('');
console.log('╔══════════════════════════════════════════════╗');
console.log('║   UTSOV WhatsApp — One-Time QR Setup         ║');
console.log('╚══════════════════════════════════════════════╝');
console.log('');
console.log('A browser window is opening...');
console.log('');
console.log('STEPS:');
console.log('  1. Wait for QR code to appear in the browser');
console.log('  2. Open WhatsApp on your phone');
console.log('  3. Go to Settings → Linked Devices → Link a Device');
console.log('  4. Scan the QR code shown in the browser');
console.log('  5. Wait for "SESSION SAVED" message below');
console.log('  6. Press Ctrl+C after that');
console.log('');

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'utsov', dataPath: SESSION_DIR }),
  puppeteer: {
    headless: false,   // MUST be visible for QR scanning
    executablePath: 'C:\\Users\\sanji\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  },
});

client.on('qr', qr => {
  console.log('📷 QR Code ready — scan it with your phone now:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n(Also visible in the browser window that just opened)\n');
});

client.on('loading_screen', (pct, msg) => {
  process.stdout.write(`\r⏳ Loading WhatsApp... ${pct}%    `);
});

client.on('authenticated', () => {
  console.log('\n\n✅ Phone scanned successfully! Loading your chats...');
});

client.on('auth_failure', () => {
  console.error('\n❌ Authentication failed. Please restart and try again.');
  process.exit(1);
});

client.on('ready', async () => {
  console.log('✅ WhatsApp connected!\n');

  // Verify the target group exists
  const chats  = await client.getChats();
  const groups = chats.filter(c => c.isGroup);
  const target = groups.find(g => g.name === TARGET);

  console.log(`\n📋 Found ${groups.length} groups.`);
  if (target) {
    console.log(`✅ Target group found: "${TARGET}"`);
    // Send a real test message
    await target.sendMessage('✅ *UTSOV Test Suite connected!* The automated website test reports are now set up and will be posted here daily at 8 AM and 11 PM. 🪔');
    console.log(`✅ Test message sent to "${TARGET}" — check the group now!`);
  } else {
    console.log(`⚠️  Group "${TARGET}" not found. Available UTSOV groups:`);
    groups.filter(g => g.name.toLowerCase().includes('utsov')).forEach(g => console.log(`   • "${g.name}"`));
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   ✅ SESSION SAVED — Setup complete!         ║');
  console.log('║   You can now press Ctrl+C to close.         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  // Keep alive for 30s so user can see the message
  await new Promise(r => setTimeout(r, 30000));
  await client.destroy();
  process.exit(0);
});

client.initialize().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
