import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCombatHit } from '../../src/engine/combat/resolveCombatHit.mjs';

test('forwards every original attack argument unchanged', () => {
  const values = Array.from({ length: 17 }, (_, i) => ({ index: i }));
  let received;
  const output = { newDefenderHp: values[0], damageEvents: [], critical: false };
  const result = resolveCombatHit((...args) => { received = args; return output; }, ...values);
  assert.equal(result, output);
  assert.equal(received.length, values.length);
  values.forEach((value, i) => assert.equal(received[i], value));
});

test('preserves original counter/normal-hit distinction', () => {
  const attacks = [];
  function resolver(...args) { attacks.push(args); return { status: 'ok' }; }
  resolveCombatHit(resolver, 'player', 'enemy', false);
  resolveCombatHit(resolver, 'enemy', 'player', true);
  assert.deepEqual(attacks, [['player', 'enemy', false], ['enemy', 'player', true]]);
});

test('does not coerce arbitrary precision values', () => {
  const decimal = { toString: () => '1e100000', times: () => { throw Error('no mutation'); } };
  const result = resolveCombatHit((hp) => hp, decimal);
  assert.equal(result, decimal);
});
