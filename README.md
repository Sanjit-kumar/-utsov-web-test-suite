# UTSOV Website Test Suite

Automated test framework for **https://www.utsov.org** — runs functional, integration, and security tests on a Desktop Chrome profile, then emails a full HTML report and sends a WhatsApp summary to the team.

> **Important:** Tests run against the live production server. The suite is designed to use only browser navigation (`page.goto`) — never raw HTTP hammering — to avoid triggering the server's firewall (CSF/ModEvasive on GoDaddy shared hosting). Do **not** add tests that loop direct `request.get()` or `request.post()` calls.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- Windows (email sending uses local Outlook COM automation)
- Microsoft Outlook desktop app, signed in

---

## Setup (one-time)

### 1. Install dependencies
```
npm install
npx playwright install chromium
```

### 2. Create the `.env` file
Create a file named `.env` in the project root with your Outlook password:
```
EMAIL_PASSWORD=your_outlook_password_here
```
> If your Hotmail/Outlook account uses 2FA, generate an **App Password** at https://account.microsoft.com/security and use that here.

### 3. Set email recipients
Open `email.properties.json` and add addresses to the `recipients` array:
```json
{
  "recipients": [
    "you@example.com",
    "teammate@example.com"
  ]
}
```

---

## Running the Tests

### Run everything (tests + email report + WhatsApp)
```
node run-tests.js
```

### Run only the tests (no email/WhatsApp)
```
npm run test:all
```

### Run a specific category
```
npm run test:functional
npm run test:integration
npm run test:security
```

---

## What Gets Tested

| Category | Tests | What It Covers |
|---|---|---|
| **Functional** | `tests/functional/` | Navigation, mobile hamburger menu, homepage sections, contact forms, subpages, scroll animations |
| **Integration** | `tests/integration/` | HTTP 200 on all pages, nav/footer link integrity, SEO (robots.txt, sitemap, Open Graph), image rendering, domain/SSL/HTTPS |
| **Security** | `tests/security/` | HTTPS enforcement, security headers, mixed content, cookie attributes, malware signatures, hidden iframes, obfuscated scripts |

Tests run on three browser profiles per run:
- **Desktop** — Chrome, standard 1280×720
- **Android** — Pixel 5 emulation
- **Mac** — Chromium with Safari user-agent, 1440×900

---

## Automated Daily Schedule

To register daily scheduled runs (requires Administrator):
```
setup-scheduler.bat
```

This registers two Windows Task Scheduler tasks:
- **8:00 AM** every day
- **11:00 PM** every day

Each run executes all tests, sends the email report, and sends the WhatsApp summary.

---

## WhatsApp Setup (one-time, only if session is expired)

1. Set the group name in `whatsapp.properties.json` — must match **exactly** as it appears in WhatsApp:
```json
{
  "groups": ["Utsov - Communication/Marketing bridge team"]
}
```

2. Run the QR setup (a browser window opens):
```
node whatsapp/test-whatsapp.js
```

3. Scan the QR code with your WhatsApp mobile app under **Settings → Linked Devices**.

Session is saved locally. No QR scan needed on future runs unless the session expires.

---

## Project Structure

```
├── run-tests.js              ← Master runner — start here
├── playwright.config.js      ← Test config (timeouts, platforms, base URL)
├── package.json
├── .env                      ← Your email password (never commit this)
├── email.properties.json     ← Email recipients and settings
├── whatsapp.properties.json  ← WhatsApp group names
├── setup-scheduler.bat       ← Register Windows scheduled tasks
├── tests/
│   ├── functional/           ← UI and behaviour tests
│   ├── integration/          ← HTTP, links, images, SEO, domain
│   └── security/             ← HTTPS, headers, XSS, malware detection
├── email/
│   ├── build-report.js       ← Builds branded HTML email report
│   └── send-report.js        ← Sends via Outlook COM (no SMTP needed)
├── whatsapp/
│   ├── send-whatsapp.js      ← Sends WhatsApp message to groups
│   └── test-whatsapp.js      ← One-time QR code session setup
└── test-results/             ← Auto-generated — results, screenshots, HTML report
```

---

## Troubleshooting

**Email not sending**
- Make sure Outlook desktop app is open and signed in
- Double-check `EMAIL_PASSWORD` in `.env`
- If using 2FA, use an App Password (not your main password)

**WhatsApp not sending**
- Delete the `whatsapp-session/` folder and re-run `node whatsapp/test-whatsapp.js` to get a fresh QR code

**Tests timing out**
- Increase the `timeout` value in `playwright.config.js` (currently 45 seconds)
- Check that https://www.utsov.org is reachable from your network
