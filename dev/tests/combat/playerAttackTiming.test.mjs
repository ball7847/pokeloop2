import test from 'node:test';
import assert from 'node:assert/strict';
import { playerAttackIntervalMs } from '../../src/engine/combat/playerAttackTiming.mjs';

const interval = (overrides = {}) => playerAttackIntervalMs({ baseIntervalMs: 1000, ...overrides });

test('base attack interval matches unchanged source formula', () => {
  assert.equal(interval(), 1000);
});

test('1000 Haste stacks halve the interval', () => {
  assert.equal(interval({ hasteStacks: 1000 }), 500);
});

test('Slow and Haste multipliers cancel at equal stack values', () => {
  assert.equal(interval({ slowStacks: 400, hasteStacks: 400 }), 1000);
});

test('BananaSlip doubles the interval', () => {
  assert.equal(interval({ bananaSlipStacks: 1 }), 2000);
});

test('flow state applies only to first attack against unlocked enemy', () => {
  assert.equal(interval({ inFlowState: true, glossaryUnlocked: true, flowStateLevel: 20 }), 800);
  assert.equal(interval({ inFlowState: true, glossaryUnlocked: false, flowStateLevel: 20 }), 1000);
  assert.equal(interval({ inFlowState: true, glossaryUnlocked: true, flowStateLevel: 20, playerAttackCount: 1 }), 1000);
});

test('flow multiplier is capped at 0.1', () => {
  assert.equal(interval({ inFlowState: true, glossaryUnlocked: true, flowStateLevel: 200 }), 100);
});

test('combined effects preserve original multiplication order', () => {
  const expected = 1500 * 1.25 / 1.5 * 2 * 0.9;
  assert.equal(interval({ baseIntervalMs: 1500, slowStacks: 250, hasteStacks: 500,
    bananaSlipStacks: 1, inFlowState: true, glossaryUnlocked: true, flowStateLevel: 10 }), expected);
});
