import test from 'node:test';
import assert from 'node:assert/strict';
import { createEncounterState } from '../../src/engine/combat/createEncounterState.mjs';

const start = (overrides = {}) => createEncounterState({
  enemyId: 'stick-man',
  encounterId: 'enc-1',
  startedAt: 6000,
  playerMaxHp: 100,
  enemyMaxHp: 200,
  ...overrides,
});

test('fresh fight has empty temporary statuses', () => {
  const state = start();
  assert.deepEqual(state.statuses, { player: {}, enemy: {} });
  assert.equal(state.currentPlayerHp, 100);
  assert.equal(state.currentEnemyHp, 200);
});

test('chained fight retains positive current HP but drops all combat stacks', () => {
  const previousCombat = {
    currentPlayerHp: 42,
    statuses: {
      player: { Haste: 900, Inspiration: 100, Thorns: 44 },
      enemy: { Poison: 50 },
    },
    lastVictory: { time: 4000 },
  };
  const state = start({ previousCombat, chained: true });
  assert.equal(state.currentPlayerHp, 42);
  assert.deepEqual(state.statuses, { player: {}, enemy: {} });
  assert.equal(state.isInFlowState, true);
  assert.equal(previousCombat.statuses.player.Haste, 900);
});

test('new fight starts at max HP and never inherits statuses', () => {
  const state = start({
    previousCombat: { currentPlayerHp: 22, statuses: { player: { Haste: 4 } } },
    chained: false,
  });
  assert.equal(state.currentPlayerHp, 100);
  assert.deepEqual(state.statuses.player, {});
});

test('nonpositive carry-over HP falls back to max HP', () => {
  assert.equal(start({
    chained: true,
    previousCombat: { currentPlayerHp: 0, statuses: { player: { Inspiration: 8 } } },
  }).currentPlayerHp, 100);
});

test('supports arbitrary precision HP without Number conversion', () => {
  const hp = { gt: (n) => n === 0, toString: () => '1e1000' };
  const max = { toString: () => '1e2000' };
  const state = start({ playerMaxHp: max, chained: true, previousCombat: { currentPlayerHp: hp } });
  assert.equal(state.currentPlayerHp, hp);
});

test('timestamps and flow state follow original encounter boundary', () => {
  const state = start({ chained: true, previousCombat: { currentPlayerHp: 99 },
    lastVictory: { time: 100 } });
  assert.equal(state.isInFlowState, false);
  assert.equal(state.lastStatusTick, 6000);
  assert.equal(state.lastEnemyAttackTime, 6000);
});
