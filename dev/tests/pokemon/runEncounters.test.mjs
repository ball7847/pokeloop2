import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPokemonRunEncounters, getPokemonRunEncounter } from '../../src/pokeloop/runEncounters.js';
import { POKEMON } from '../../src/pokeloop/pokemon.js';

const eligible = POKEMON.filter(p => !p.evolved && !p.boss && p.rarity === 'scrap');
test('independent Redraw rolls keep unevolved species and combat references', () => {
  const catalog = Object.fromEntries(eligible.map((p) => [
    p.templateId, { id:p.templateId, name:'Original', stats:{maxHp:42}, rewards:[1], rarity:'scrap' },
  ]));
  let calls=0;
  const run=buildPokemonRunEncounters({catalog,pokemon:eligible,rng:()=>{calls++;return 0.5;}});
  assert.equal(calls,eligible.length);
  assert.equal(Object.keys(run).length,eligible.length);
  for (const p of eligible) {
    const original=catalog[p.templateId];
    const view=getPokemonRunEncounter(run,p.id);
    assert.ok(view);
    assert.equal(view.id,p.id);
    assert.equal(view.pokemon.originalTemplateId,p.templateId);
    assert.equal(view.stats,original.stats);
    assert.equal(view.rewards,original.rewards);
    assert.equal(original.name,'Original');
    assert.equal(original.id,p.templateId);
    assert.equal(view.pokemon.types.length,p.types.length);
  }
  assert.equal(getPokemonRunEncounter(run,'not-found'),null);
});
test('zero probability selects nothing, no evolved species or bosses',()=>{
  const catalog=Object.fromEntries(POKEMON.map(p=>[p.templateId,{id:p.templateId}]));
  const none=buildPokemonRunEncounters({catalog,rng:()=>0.5,chances:{scrap:0,rough:0,framed:0,opus:0,masterpiece:0}});
  assert.equal(Object.keys(none).length,0);
  const all=buildPokemonRunEncounters({catalog,rng:()=>0,chances:{scrap:100,rough:100,framed:100,opus:100,masterpiece:100}});
  assert.ok(Object.values(all).every(e=>!POKEMON.find(p=>p.id===e.id)?.evolved));
  assert.ok(Object.values(all).every(e=>!POKEMON.find(p=>p.id===e.id)?.boss));
});
test('duplicate species encounter IDs are rejected',()=>{
  const p=eligible[0];
  assert.throws(()=>buildPokemonRunEncounters({catalog:{[p.templateId]:{id:p.templateId}},pokemon:[p,p],rng:()=>0}),/Duplicate/);
});

test('availableSketches selection preserves shared-template Pokemon IDs', async () => {
 const { selectAvailablePokemonEncounters } = await import('../../src/pokeloop/runEncounters.js');
 const original={id:'shared',stats:{maxHp:42}};
 const run=buildPokemonRunEncounters({catalog:{shared:original},pokemon:[
 {id:'dex-1',dex:1,name:'A',types:['grass'],rarity:'scrap',evolved:false,boss:false,templateId:'shared'},
 {id:'dex-4',dex:4,name:'B',types:['fire'],rarity:'scrap',evolved:false,boss:false,templateId:'shared'},
 ],rng:()=>0});
 assert.deepEqual(Object.keys(selectAvailablePokemonEncounters(run,['shared'])).sort(),['dex-1','dex-4']);
 assert.equal(Object.keys(selectAvailablePokemonEncounters(run,[])).length,0);
 assert.equal(original.id,'shared');
});
