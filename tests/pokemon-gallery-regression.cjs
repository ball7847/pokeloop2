// Run: node tests/pokemon-gallery-regression.cjs
// Isolated store simulation; does not claim browser-rendering coverage.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/pokeloop/pokemonPanel.js'), 'utf8')
  .replace(/^import .+;\r?\n/gm, '')
  .replace(/export function /g, 'function ');
const create = new Function('POKEMON','rollRunRoster','TYPE_LABELS','store','originalCatalog',
  'window','localStorage','document','Event', source +
  '\nreturn {mountPokemonPanel, challengePokemonSpecies};');

function setup() {
  const species = [
    {id:'dex-1', dex:1, name:'A', templateId:'template', types:['grass'], rarity:'scrap', evolved:false, boss:false},
    {id:'dex-2', dex:2, name:'B', templateId:'template', types:['water'], rarity:'scrap', evolved:false, boss:false},
  ];
  const listeners = [];
  let rolls = 0;
  const state = {
    currentSaveSlot:'slot1', multiverse:{currentUniverseId:'original'}, redrawCount:0,
    availableSketches:['template'], rarityChances:{scrap:100},
    sketchVictories:{template:0}, fundamentals:{maxVictories:10},
    challengeCooldownUntil:0, combatState:{isFighting:false, enemyId:null},
  };
  const store = {getState:()=>state,subscribe:fn=>{listeners.push(fn);return ()=>{};}};
  const storage = {items:{},getItem(k){return this.items[k]??null;},
    setItem(k,v){this.items[k]=v;}};
  const win = {dispatchEvent(){}};
  function change(patch) {
    const before = {...state,sketchVictories:{...state.sketchVictories},
      combatState:{...state.combatState}};
    Object.assign(state,patch);
    listeners.forEach(fn=>fn(state,before));
  }
  state.challengeSketch = id=>change({combatState:{isFighting:true,enemyId:id}});
  const bridge = create(species,()=>{rolls++;return species;},{grass:'풀',water:'물'},
    store,{template:{stats:{maxHp:2,attack:1},rewards:[],currencyRewards:[]}},
    win,storage,{getElementById:()=>null},class TestEvent {});
  bridge.mountPokemonPanel();
  return {state,win,storage,bridge,change,get rolls(){return rolls;}};
}

const app=setup();
assert.equal(app.rolls,1,'roll once at first redraw');
assert.equal(app.win.__pokeloopGalleryRoster().length,2);
assert.equal(app.bridge.challengePokemonSpecies('dex-2'),true);
assert.equal(app.win.__pokeloopBattleSpecies('template')?.id,'dex-2');
assert.match(app.win.__pokeloopBattleSpecies('template').battleLabel,/물/);
app.change({sketchVictories:{template:1},combatState:{isFighting:false,enemyId:null}});
assert.equal(app.win.__pokeloopGalleryRoster().find(x=>x.id==='dex-2').pokemonVictories,1);
assert.equal(app.win.__pokeloopGalleryRoster().find(x=>x.id==='dex-1').pokemonVictories,0);
assert.equal(app.win.__pokeloopBattleSpecies('template'),null,'no stale battle identity');
app.change({redrawCount:1,sketchVictories:{template:0}});
app.win.__pokeloopGalleryRoster(); // Roster is loaded lazily on Gallery read.
assert.equal(app.rolls,2,'roll only once for new redraw');
assert.equal(app.win.__pokeloopGalleryRoster().find(x=>x.id==='dex-2').pokemonVictories,1,
  'win history survives redraw');
app.win.__pokeloopGalleryRoster();
assert.equal(app.rolls,2,'gallery render must not reroll');
console.log('Pokemon gallery regression tests: PASS');
