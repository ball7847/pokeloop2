import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  await page.goto(base, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => {
    const root = document.querySelector('#root');
    return root && root.textContent?.trim().length > 30;
  }, null, { timeout: 30000 });
  // Import the same modules that the production bundle imports. This verifies
  // loading + parsing in a real browser, including relative paths.
  const paths = [
    'createEncounterState', 'playerAttackTiming', 'enemyAttackTiming',
    'inspirationMultiplier', 'damageVariance', 'armorMitigation',
    'absorbMitigation', 'resolveCombatHit'
  ];
  const exportsOk = await page.evaluate(async names => {
    const imported = await Promise.all(names.map(async n => {
      const m = await import(`./src/engine/combat/${n}.mjs`);
      return Object.values(m).some(value => typeof value === 'function');
    }));
    return imported.every(Boolean);
  }, paths);
  if (!exportsOk) errors.push('One or more engine modules have no function export');
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Browser smoke test passed: visible root, modules, no page errors');
} finally {
  await browser.close();
}
