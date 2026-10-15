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
    // The real app's Zustand store is exposed by its existing compiled export
    // ('u' in this build). Assert that the live game initialized instead of
    // only checking that unrelated helper modules import.
    const liveGame = await import('./assets/game-store-DKXacG7P.js');
    assertLiveGame(liveGame);
    function assertLiveGame(mod) {
      if (!mod.u || typeof mod.u.getState !== 'function') {
        throw new Error('Original game store export unavailable');
      }
      const state = mod.u.getState();
      if (!state || typeof state.challengeSketch !== 'function' || !state.combatState) {
        throw new Error('Original combat actions/state did not initialize');
      }
    }
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
    return { checks: 13, modules: modules.length };
  });

  // Real store-action test in a disposable browser context. It exercises the
  // *actual* compiled challengeSketch action, not only createEncounterState.
  const actualBattle = await page.evaluate(async () => {
    const { u: store } = await import('./assets/game-store-DKXacG7P.js');
    const snapshot = store.getState();
    if (typeof store.setState !== 'function') throw new Error('Missing setState');
    const enemyId = 'stick man'; // Verified ID from the original sketch catalog.
    try {
      store.setState({
        combatState: {
          ...snapshot.combatState,
          isFighting: false,
          enemyId: null,
          lastVictory: { time: Date.now() },
          currentPlayerHp: snapshot.playerStats.maxHp.times(0.5),
          statuses: { player: { Haste: 700, Inspiration: 55 }, enemy: { Poison: 4 } },
        },
        challengeCooldownUntil: 0,
        autoChallengeActive: false,
        autoRetryActive: false,
        combatDiscoveryAnimation: null,
        devSettings: { ...snapshot.devSettings, disableDiscoveryAnimations: true },
        sketchVictories: { ...snapshot.sketchVictories, [enemyId]: 0 },
        fundamentals: { ...snapshot.fundamentals, maxVictories: Math.max(1, snapshot.fundamentals.maxVictories) },
      });
      store.getState().challengeSketch(enemyId, true);
      const combat = store.getState().combatState;
      if (!combat.isFighting || combat.enemyId !== enemyId) {
        throw new Error('Live challengeSketch failed to begin encounter');
      }
      if (!combat.currentPlayerHp.eq(snapshot.playerStats.maxHp.times(0.5))) {
        throw new Error('Live chained battle failed to carry player HP');
      }
      if (Object.keys(combat.statuses.player).length || Object.keys(combat.statuses.enemy).length) {
        throw new Error('Live chained battle inherited temporary statuses');
      }
      return { enemyId, hpCarryover: true, stacksReset: true };
    } finally {
      // Prevent side effects from polluting later tests in this fresh context.
      store.setState(snapshot, true);
    }
  });
  console.log('Live battle startup verified:', JSON.stringify(actualBattle));

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
