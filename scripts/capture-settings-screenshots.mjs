import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE_URL = process.env.PHOMU_SCREENSHOT_BASE_URL ?? 'http://127.0.0.1:3000/Phomu';

async function run() {
  await mkdir('artifacts', { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const targets = [
    { path: '/settings', file: 'artifacts/settings-hub-redesign.png' },
    { path: '/settings/audio', file: 'artifacts/settings-audio-redesign.png' },
    { path: '/guide', file: 'artifacts/guide-page.png' },
  ];

  for (const target of targets) {
    const url = `${BASE_URL}${target.path}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.screenshot({ path: target.file, fullPage: true });
    console.log(`Saved ${target.file} from ${url}`);
  }

  await browser.close();
}

run().catch((error) => {
  console.error('Screenshot capture failed:', error);
  process.exit(1);
});
