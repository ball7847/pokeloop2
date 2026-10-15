import test from 'node:test';
import assert from 'node:assert/strict';
import { originalAutoAttackTypeMultiplier, scaleOriginalHitDamage } from '../../src/pokemon/originalAutoAttackTypes.mjs';

test('unmapped enemies and unselected attack type cannot alter original combat', () => {
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'player'}),1);
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'enemy',enemyPokemonTypes:['fire']}),1);
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'player',enemyPokemonTypes:['ghost'],dittoAssimilation:{normal:100}}),1);
});
test('explicit attacking type uses agreed 0.25x effectiveness and assimilation', () => {
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'player',attackType:'normal',enemyPokemonTypes:['ghost'],dittoAssimilation:{normal:100}}),0.25);
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'player',attackType:'fire',enemyPokemonTypes:['bug','steel'],dittoAssimilation:{fire:200}}),36);
  assert.equal(originalAutoAttackTypeMultiplier({attackerSide:'enemy',attackType:'fire',enemyPokemonTypes:['grass'],dittoAssimilation:{normal:100}}),1);
});
test('multiplication preserves arbitrary precision damage shape', () => {
  const decimal={times: n=>({factor:n,large:'1e100000'})};
  assert.equal(scaleOriginalHitDamage(decimal,1),decimal);
  assert.deepEqual(scaleOriginalHitDamage(decimal,0.25),{factor:0.25,large:'1e100000'});
  assert.throws(()=>scaleOriginalHitDamage(decimal,-1),RangeError);
});
