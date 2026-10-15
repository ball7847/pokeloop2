import test from 'node:test';
import assert from 'node:assert/strict';
import { prototypePokemon, getPrototypePokemon, overlayPrototypePokemon } from '../../src/pokemon/prototypeRoster.mjs';

test('exactly ten unique unevolved prototype species and ten template IDs', () => {
  assert.equal(prototypePokemon.length, 10);
  assert.equal(new Set(prototypePokemon.map(x => x.id)).size, 10);
  assert.equal(new Set(prototypePokemon.map(x => x.templateId)).size, 10);
  assert.ok(prototypePokemon.every(x => x.types.length >= 1 && x.types.length <= 2));
});

test('returns Pokémon by original enemy template', () => {
  assert.equal(getPrototypePokemon('stick man')?.nameKo, '이상해씨');
  assert.equal(getPrototypePokemon('unknown enemy'), null);
});

test('overlay preserves encounter ID, reward references, rarity and stats', () => {
  const stats = { maxHp: { toString: () => '1e1200' }, attack: 12 };
  const rewards = [{ name: 'Graphite', amount: 3 }];
  const template = { id: 'stick man', name: 'Stick Man', rarity: 'scrap', stats, currencyRewards: rewards };
  const out = overlayPrototypePokemon(template);
  assert.equal(out.name, '이상해씨');
  assert.equal(out.id, template.id);
  assert.equal(out.rarity, template.rarity);
  assert.equal(out.stats, stats);
  assert.equal(out.currencyRewards, rewards);
  assert.deepEqual(out.pokemon.types, ['grass', 'poison']);
  assert.equal(template.name, 'Stick Man');
});

test('unmapped templates remain unchanged', () => {
  const template = { id: 'other', stats: {} };
  assert.equal(overlayPrototypePokemon(template), template);
});
