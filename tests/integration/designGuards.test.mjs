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
