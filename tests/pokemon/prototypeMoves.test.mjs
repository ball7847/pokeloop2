import test from 'node:test';
import assert from 'node:assert/strict';
import { prototypePokemon } from '../../src/pokemon/prototypeRoster.mjs';
import { prototypeMoves, getPrototypeMoves, previewMoveMatchup } from '../../src/pokemon/prototypeMoves.mjs';

test('all 10 species have exactly four distinct typed move slots', () => {
  assert.equal(Object.keys(prototypeMoves).length, 10);
  for (const pokemon of prototypePokemon) {
    const moves = getPrototypeMoves(pokemon.slug);
    assert.equal(moves.length, 4);
    assert.deepEqual(moves.map(move => move.slot), [0,1,2,3]);
    assert.equal(new Set(moves.map(move => move.id)).size, 4);
  }
});

test('move preview combines original Pokémon type chart and STAB eligibility flag', () => {
  const fire = previewMoveMatchup('charmander', 1, ['grass','bug']);
  assert.equal(fire.move.id,'ember');
  assert.equal(fire.effectiveness,4);
  assert.equal(fire.sameType,true);
  const neutral = previewMoveMatchup('charmander',0,['ghost']);
  assert.equal(neutral.effectiveness,0);
  assert.equal(neutral.sameType,false);
  const blocked = previewMoveMatchup('pikachu',1,['water','ground']);
  assert.equal(blocked.effectiveness,0);
});

test('invalid names or slots throw; known moves are read-only', () => {
  assert.equal(getPrototypeMoves('missing'),null);
  assert.throws(()=>previewMoveMatchup('missing',0,['normal']),TypeError);
  assert.throws(()=>previewMoveMatchup('pikachu',4,['normal']),RangeError);
  assert.ok(Object.isFrozen(getPrototypeMoves('pikachu')));
  assert.ok(Object.isFrozen(getPrototypeMoves('pikachu')[0]));
});
