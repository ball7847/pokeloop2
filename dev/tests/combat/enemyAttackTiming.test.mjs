import test from 'node:test';
import assert from 'node:assert/strict';
import { enemyAttackIntervalMs } from '../../src/engine/combat/enemyAttackTiming.mjs';

const interval = (overrides = {}) =>
  enemyAttackIntervalMs({ baseIntervalMs: 1000, ...overrides });

test('enemy interval unchanged without statuses', () => {
  assert.equal(interval(), 1000);
});

test('Haste shortens enemy interval', () => {
  assert.equal(interval({ hasteStacks: 1000 }), 500);
});

test('Slow lengthens enemy interval', () => {
  assert.equal(interval({ slowStacks: 1000 }), 2000);
});

test('BananaSlip doubles enemy interval', () => {
  assert.equal(interval({ bananaSlipStacks: 2 }), 2000);
});

test('combined status multipliers match original source ordering', () => {
  const expected = 1200 * 1.3 * (1 / 1.4) * 2;
  assert.equal(enemyAttackIntervalMs({
    baseIntervalMs: 1200, slowStacks: 300,
    hasteStacks: 400, bananaSlipStacks: 1,
  }), expected);
});
