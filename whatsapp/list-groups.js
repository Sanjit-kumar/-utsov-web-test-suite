// Diagnostic: list all available WhatsApp chats/groups
'use strict';
const { Client, LocalAuth } = require('whatsapp-web.js');
const path = require('path');
const fs   = require('fs');

const SESSION_DIR = path.join(__dirname, '..', 'whatsapp-session');
const TARGET      = 'Utsov - Communication/Marketing bridge team';

const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'utsov', dataPath: SESSION_DIR }),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Users\\sanji\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  },
});

client.on('loading_screen', (pct) => process.stdout.write(`\rLoading... ${pct}%   `));
client.on('authenticated',  () => console.log('\n✅ Authenticated'));

client.on('ready', async () => {
  console.log('\n✅ Connected. Fetching all chats...\n');
  const chats  = await client.getChats();
  const groups  = chats.filter(c => c.isGroup);
  const singles = chats.filter(c => !c.isGroup).slice(0, 5);

  console.log(`📋 Found ${groups.length} groups:\n`);
  groups.forEach((g, i) => {
    const match = g.name === TARGET ? '  ← ✅ EXACT MATCH' : '';
    const close = g.name.toLowerCase().includes('utsov') || g.name.toLowerCase().includes('marketing') ? '  ← 🔍 similar' : '';
    console.log(`  ${i+1}. "${g.name}"${match}${close}`);
  });

  console.log(`\n📋 First 5 individual chats:\n`);
  singles.forEach((c, i) => console.log(`  ${i+1}. "${c.name || c.id.user}"`));

  const found = groups.find(g => g.name === TARGET);
  console.log(`\n🎯 Target group: "${TARGET}"`);
  if (found) {
    console.log(`✅ Found exact match — sending test message NOW...`);
    await found.sendMessage('🧪 *UTSOV Test Suite* — connection test. Please ignore this message.');
    console.log('✅ Test message sent! Check your group now.');
  } else {
    console.log('❌ No exact match found. Copy the exact name from above and update whatsapp.properties.json');
  }

  await client.destroy();
  process.exit(0);
});

client.on('qr', qr => {
  console.log('⚠️  Session expired — please re-scan QR code');
  console.log('   Delete whatsapp-session/ folder and run this script again');
});

setTimeout(() => { client.destroy().catch(()=>{}); process.exit(1); }, 90000);
client.initialize().catch(e => { console.error('Error:', e.message); process.exit(1); });
