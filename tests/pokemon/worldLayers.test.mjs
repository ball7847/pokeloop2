import test from 'node:test';
import assert from 'node:assert/strict';
import { TYPES } from '../../src/pokeloop/core.js';
import { TYPE_LAYERS, SPACE_TRAVEL, layerOfType } from '../../src/pokemon/worldLayers.mjs';

test('ten layers contain every Pokémon type exactly once', () => {
  assert.equal(TYPE_LAYERS.length, 10);
  assert.deepEqual(TYPE_LAYERS.map(x => x.level), [1,2,3,4,5,6,7,8,9,10]);
  const types = TYPE_LAYERS.flatMap(x => x.types);
  assert.equal(types.length, 18);
  assert.equal(new Set(types).size, 18);
  assert.deepEqual(new Set(types), new Set(TYPES));
});
test('agreed conceptual assignments are not reordered', () => {
  assert.equal(layerOfType('normal').name, '세계');
  assert.equal(layerOfType('fairy').name, '초월');
  assert.deepEqual(layerOfType('fighting').types, ['fighting','psychic','dark']);
});
test('star dust is distinct from type energy', () => {
  assert.equal(SPACE_TRAVEL.systemName, '우주 여행');
  assert.equal(SPACE_TRAVEL.buttonLabel, '우주 여행 떠나기');
  assert.equal(SPACE_TRAVEL.permanentCurrencyCode, 'SP');
  assert.notEqual(SPACE_TRAVEL.permanentCurrency, SPACE_TRAVEL.energyResource);
});
