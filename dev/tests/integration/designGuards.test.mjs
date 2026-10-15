import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sketches = fs.readFileSync('assets/data-sketches-B3moo1Ps.js','utf8');
const game = fs.readFileSync('assets/game-store-DKXacG7P.js','utf8');
test('original encounter catalog not mutated by prototype overlay', () => {
  assert.match(sketches, /id:"stick man",name:"Stick Man"/);
  assert.doesNotMatch(sketches, /prototypeRoster\.mjs/);
  assert.doesNotMatch(sketches, /prototypeMoves\.mjs/);
  assert.doesNotMatch(sketches, /entry\.pokemon=/);
});
test('no four-move combat or catalog code is introduced', () => {
  assert.doesNotMatch(game, /prototypeMoves|previewMoveMatchup|moveSlot/);
  assert.doesNotMatch(sketches, /prototypeMoves|previewMoveMatchup/);
});
test('original battle action remains present', () => {
  assert.match(game, /challengeSketch:\(e,t=!1\)=>/);
  assert.match(game, /combatState:createEncounterState\(/);
});

test('training-dummy battle starts with clean temporary status state', () => {
  const start = game.indexOf('startTrainingDummy:');
  const end = game.indexOf('endTrainingDummy:', start);
  assert.ok(start >= 0 && end > start, 'Training entry point must remain available');
  const training = game.slice(start,end);
  assert.match(training, /statuses:\{player:\{\},enemy:\{\}\}/);
  assert.match(training, /pendingCombatEffects:\[\]/);
  assert.match(training, /currentPlayerHp:r\.playerStats\.maxHp/);
  assert.match(training, /isInFlowState:!1/);
});

test('original battle must not import duplicated type multipliers', () => {
  assert.doesNotMatch(game, /originalAutoAttackTypes|originalAutoAttackTypeMultiplier/);
  assert.doesNotMatch(game, /prototypeMoves|previewMoveMatchup/);
  assert.doesNotMatch(sketches, /originalAutoAttackTypes|originalAutoAttackTypeMultiplier/);
});

test('tier presentation uses core tiers instead of a second hardcoded chart', () => {
  const layers = fs.readFileSync('src/pokemon/worldLayers.mjs', 'utf8');
  assert.match(layers, /import \{ TIERS \} from '\.\.\/pokeloop\/core\.js'/);
  assert.match(layers, /TIERS\.map\(/);
});
