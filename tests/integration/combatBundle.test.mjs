import fs from 'node:fs';
import assert from 'node:assert/strict';

const game = fs.readFileSync('assets/game-store-DKXacG7P.js','utf8');
const resolver = fs.readFileSync('assets/data-skill-tree-DvCthzIY.js','utf8');

const count = pattern => (game.match(pattern) || []).length;

const expected = [
  ['createEncounterState', 'combatState:createEncounterState(', 1],
  ['playerAttackIntervalMs', 'const R=playerAttackIntervalMs(', 1],
  ['enemyAttackIntervalMs', 'const O=enemyAttackIntervalMs(', 1],
  ['inspirationMultiplier', 'inspirationMultiplier(O,f)', 2],
  ['resolveCombatHit', 'resolveCombatHit(rn,', 6],
];
for (const [name, call, occurrences] of expected) {
  const source = `import{${name}}from"../src/engine/combat/${name === 'inspirationMultiplier' ? 'inspirationMultiplier' : name === 'resolveCombatHit' ? 'resolveCombatHit' : name === 'createEncounterState' ? 'createEncounterState' : name === 'enemyAttackIntervalMs' ? 'enemyAttackTiming' : 'playerAttackTiming'}.mjs";`;
  assert.ok(game.includes(source), `Missing import: ${name}`);
  assert.equal(game.split(call).length - 1, occurrences, `Unexpected calls: ${name}`);
}
assert.equal(count(/\brn\(/g), 0, 'All direct original resolver calls should be behind adapter');

// The bundled original is the single source of truth for the damage
// formula; the wrapper should not silently reimplement it.
assert.match(resolver, /pp=\(e,o,s,i,n,a,l,d,u,g,f,c=!1,x=!0,C=\{\},T=0,v=0\)=>/);
assert.match(resolver, /pp as aa/);

assert.match(resolver, /^import\{calculateDamageVariance\}from"\.\.\/src\/engine\/combat\/damageVariance\.mjs";/);
assert.equal(resolver.split('calculateDamageVariance(O,oe)').length - 1, 1);

assert.match(resolver, /^import\{applyArmorMitigation\}from"\.\.\/src\/engine\/combat\/armorMitigation\.mjs";/);
assert.equal(resolver.split('applyArmorMitigation(h,xt,r)').length - 1, 1);
console.log('Combat integration boundaries verified');
