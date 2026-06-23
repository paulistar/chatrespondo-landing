import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '../public/images/screenshots');
const BASE = 'https://panel.chatrespondo.com';
const EMAIL = process.env.CAPTURE_EMAIL ?? 'admin@chatrespondo.com';
const PASSWORD = process.env.CAPTURE_PASSWORD ?? 'Admin@123';

const SHOTS = [
  { name: 'inbox', path: '/inbox', waitMs: 3500 },
  { name: 'ai-agents', path: '/ai-agents', waitMs: 3500 },
  { name: 'kanban', path: '/pipelines', waitMs: 3500 },
  { name: 'watchdog', path: '/settings/ai', waitMs: 3500 },
  { name: 'metrics', path: '/dashboard', waitMs: 5000 },
  { name: 'members', path: '/settings/members', waitMs: 3500 },
];

function toWebp(pngPath, webpPath) {
  if (existsSync('/opt/homebrew/bin/cwebp')) {
    execFileSync('/opt/homebrew/bin/cwebp', ['-q', '82', pngPath, '-o', webpPath]);
    return;
  }
  if (existsSync('/usr/local/bin/cwebp')) {
    execFileSync('/usr/local/bin/cwebp', ['-q', '82', pngPath, '-o', webpPath]);
    return;
  }
  execFileSync('sips', ['-s', 'format', 'webp', pngPath, '--out', webpPath]);
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(inbox|dashboard)/, { timeout: 45_000 });
  await page.waitForTimeout(1500);
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    locale: 'pt-BR',
  });
  const page = await context.newPage();

  try {
    await login(page);

    for (const shot of SHOTS) {
      console.log(`Capturing ${shot.name}…`);
      await page.goto(`${BASE}${shot.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(shot.waitMs);

      const pngPath = path.join(OUT_DIR, `${shot.name}.png`);
      const webpPath = path.join(OUT_DIR, `${shot.name}.webp`);

      await page.screenshot({ path: pngPath, type: 'png' });
      toWebp(pngPath, webpPath);
      console.log(`  → ${shot.name}.webp`);
    }
  } finally {
    await browser.close();
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
