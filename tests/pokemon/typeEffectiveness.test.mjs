import test from 'node:test';
import assert from 'node:assert/strict';
import { POKEMON_TYPES, typeEffectiveness as hit } from '../../src/pokemon/typeEffectiveness.mjs';

test('all 18 modern Pokémon types are present', () => {
  assert.equal(POKEMON_TYPES.length, 18);
  assert.equal(new Set(POKEMON_TYPES).size, 18);
  for (const attacker of POKEMON_TYPES) for (const defender of POKEMON_TYPES) {
    assert.ok([0, 0.5, 1, 2].includes(hit(attacker,[defender])));
  }
});
test('dual-type effectiveness multiplies and respects immunities', () => {
  assert.equal(hit('fire',['water','ground']), 0.5);
  assert.equal(hit('electric',['water','flying']), 4);
  assert.equal(hit('fire',['grass','bug']), 4);
  assert.equal(hit('grass',['water','ground']), 4);
  assert.equal(hit('fire',['fire','water']), 0.25);
  assert.equal(hit('electric',['water','ground']), 0);
});
test('canonical immunities', () => {
  assert.equal(hit('normal',['ghost']), 0);
  assert.equal(hit('fighting',['ghost']), 0);
  assert.equal(hit('ground',['flying']), 0);
  assert.equal(hit('psychic',['dark']), 0);
  assert.equal(hit('dragon',['fairy']), 0);
  assert.equal(hit('poison',['steel']), 0);
  assert.equal(hit('ghost',['normal']), 0);
});
test('fairy, ghost and steel examples', () => {
  assert.equal(hit('fairy',['dragon']), 2);
  assert.equal(hit('ghost',['psychic']), 2);
  assert.equal(hit('steel',['fairy']), 2);
  assert.equal(hit('fire',['steel']), 2);
});
test('rejects unknown or duplicate defender types', () => {
  assert.throws(()=>hit('unknown',['water']),TypeError);
  assert.throws(()=>hit('fire',[]),TypeError);
  assert.throws(()=>hit('fire',['water','water']),TypeError);
  assert.throws(()=>hit('fire',['water','grass','flying']),TypeError);
});
