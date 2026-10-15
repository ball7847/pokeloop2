import fs from 'node:fs';
import assert from 'node:assert/strict';

// Original UI-frame scheduler is in main, not game-store. A reward/queue
// action test alone cannot establish that the next battle actually starts.
const main = fs.readFileSync('assets/main-DksMQC7H.js','utf8');
const store = fs.readFileSync('assets/game-store-DKXacG7P.js','utf8');

const required = [
  ['frame updates', 'l.tick(a)'],
  ['queued encounter eligibility', 'o.availableSketches.includes(d.sketchId)'],
  ['queued encounter start', 'k.getState().challengeSketch(d.sketchId)'],
  ['queue restoration flags', 'restoreAutoChallenge'],
  ['auto-retry gate', 'c.autoRetryActive&&c.autoRetryUnlocked'],
  ['victory settlement', 'processCombatRewards(y.id,S,w,_,g)'],
  ['queue beats auto replay', 'if(k.getState().queuedChallenge){h(0,!1);return}'],
  ['chained automatic rematch', 'b(y.id,!0)'],
];
for (const [label, token] of required) {
  assert.ok(main.includes(token), `Missing original scheduler step: ${label}`);
}
assert.ok(store.includes('queueNextChallenge:e=>'), 'Queue action missing');
assert.ok(store.includes('challengeSketch:(e,t=!1)=>'), 'Encounter action missing');

// IMPORTANT: queued-target scheduling calls challengeSketch without the
// chained flag, so it resets HP; auto-retry explicitly uses true.
// This is unchanged original behavior; do not silently conflate these.
assert.ok(main.includes('challengeSketch(d.sketchId);'));
assert.ok(main.includes('b(y.id,!0)'));
console.log('Original victory → queue/auto-retry scheduler references verified');
