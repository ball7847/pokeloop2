import { chromium } from 'playwright';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:8765/';
const browser = await chromium.launch({ headless: true });
const errors = [];
const page = await browser.newPage();
try {
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

  // Verify exported functionality inside Chromium, not just file presence.
  const moduleResults = await page.evaluate(async () => {
    const modules = await Promise.all([
      import('./src/engine/combat/createEncounterState.mjs'),
      import('./src/engine/combat/playerAttackTiming.mjs'),
      import('./src/engine/combat/enemyAttackTiming.mjs'),
      import('./src/engine/combat/inspirationMultiplier.mjs'),
      import('./src/engine/combat/damageVariance.mjs'),
      import('./src/engine/combat/armorMitigation.mjs'),
      import('./src/engine/combat/absorbMitigation.mjs'),
      import('./src/engine/combat/resolveCombatHit.mjs'),
    ]);
    const [enc, player, enemy, inspiration, variance, armor, absorb, hit] = modules;
    const old = {
      currentPlayerHp: 42,
      statuses: { player: { Haste: 999, Inspiration: 100 }, enemy: { Slow: 55 } },
      lastVictory: { time: 4000 },
    };
    const next = enc.createEncounterState({
      enemyId: 'test-foe', encounterId: 'browser-1',
      startedAt: 6000, playerMaxHp: 100, enemyMaxHp: 250,
      previousCombat: old, chained: true,
    });
    const assert = (value, msg) => {
      if (!value) throw new Error(msg);
    };
    assert(next.currentPlayerHp === 42, 'Chained HP carryover');
    assert(Object.keys(next.statuses.player).length === 0, 'Player stacks cleared');
    assert(Object.keys(next.statuses.enemy).length === 0, 'Enemy stacks cleared');
    assert(old.statuses.player.Haste === 999, 'Previous combat is not mutated');
    assert(next.isInFlowState === true, 'Flow state preserved');
    assert(player.playerAttackIntervalMs({ baseIntervalMs: 1000, hasteStacks: 1000 }) === 500, 'Player speed');
    assert(enemy.enemyAttackIntervalMs({ baseIntervalMs: 1000, slowStacks: 1000 }) === 2000, 'Enemy speed');

    class DecimalStub {
      constructor(value) { this.value = value instanceof DecimalStub ? value.value : Number(value); }
      plus(other) { return new DecimalStub(this.value + new DecimalStub(other).value); }
      minus(other) { return new DecimalStub(this.value - new DecimalStub(other).value); }
      times(other) { return new DecimalStub(this.value * new DecimalStub(other).value); }
      div(other) { return new DecimalStub(this.value / new DecimalStub(other).value); }
      eq(other) { return this.value === new DecimalStub(other).value; }
      static min(a, b) { return new DecimalStub(Math.min(new DecimalStub(a).value, new DecimalStub(b).value)); }
      static max(a, b) { return new DecimalStub(Math.max(new DecimalStub(a).value, new DecimalStub(b).value)); }
    }
    const D = value => new DecimalStub(value);
    assert(inspiration.inspirationMultiplier(100, DecimalStub).value === 2, 'Inspiration multiplier');
    assert(variance.calculateDamageVariance(D(75), D(125), () => 0.5).factor.value === 1, 'Damage variance');
    assert(armor.applyArmorMitigation(D(100), D(30), DecimalStub).value === 70, 'Armor');
    assert(absorb.applyAbsorbMitigation(D(80), D(25), DecimalStub).remaining.value === 60, 'Absorb');
    const marker = { hp: '1e100000' };
    assert(hit.resolveCombatHit(x => x, marker) === marker, 'Damage call-through');
    return { checks: 11, modules: modules.length };
  });

  if (errors.length) throw new Error(errors.join('\n'));
  console.log(`Chromium smoke passed: visible app root, ${moduleResults.modules} engine modules, ${moduleResults.checks} runtime checks`);
} catch (error) {
  console.error('Browser smoke failed:', error.message);
  try {
    await page.screenshot({ path: '/tmp/pokeloop-browser-failure.png', fullPage: true });
  } catch (captureError) {
    console.error('Screenshot failed:', captureError.message);
  }
  throw error;
} finally {
  await browser.close();
}
