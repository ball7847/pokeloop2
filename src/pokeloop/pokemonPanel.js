/**
 * Development-branch Pokémon encounter panel.
 * Uses original Rejected Draft enemy IDs for actual battles and payouts.
 * The provisional species-to-template mapping is explicitly labelled.
 * No moves and no modifications to the original combat/resolver/save schema.
 */
import { POKEMON, rollRunRoster } from './pokemon.js';
import { TYPE_LABELS } from './core.js';
import { u as store } from '../../assets/game-store-DKXacG7P.js';
import { a as originalCatalog } from '../../assets/data-sketches-B3moo1Ps.js';

const ROOT_ID = 'pokeloop-pokemon-panel';
const STORAGE = 'pokeloop2:prototype-encounters:v1';
const lookup = new Map(POKEMON.map(p => [p.id,p]));
let snapshot = null;
let runKey = '';
let expanded = false;
let selectedPokemon = null;
const BATTLE_ID = 'pokeloop-pokemon-battle';


function currentKey(state) {
  const slot = state.currentSaveSlot ?? 'browser';
  const universe = state.multiverse?.currentUniverseId ?? 'original';
  return JSON.stringify([String(slot), String(universe), String(state.redrawCount ?? 0)]);
}
function available(state) {
  const ids = new Set(state.availableSketches || []);
  return snapshot.filter(p => ids.has(p.templateId));
}
function loadOrRoll(state) {
  const nextKey = currentKey(state);
  if (runKey === nextKey && snapshot) return;
  runKey = nextKey;
  // Keep each save slot / universe / redraw snapshot separately.
  // A single {key,ids} entry previously discarded the old slot on switches.
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE)); } catch {}
  const records = saved?.records && typeof saved.records === 'object'
    ? saved.records : Object.create(null);
  if (saved?.key && Array.isArray(saved.ids) && !Object.hasOwn(records, saved.key)) {
    records[saved.key] = saved.ids; // legacy single-slot migration
  }
  if (Array.isArray(records[nextKey])) {
    const candidate = records[nextKey].map(id => lookup.get(id));
    if (candidate.every(p => p && !p.evolved && !p.boss)) {
      snapshot = candidate;
      return;
    }
  }
  // Original Rejected Draft may represent rarity settings as Decimal values
  // or omit keys on migrated saves. Normalize rather than crashing the UI.
  const chanceInput = state.rarityChances || {};
  const rarityNames = ['scrap', 'rough', 'framed', 'opus', 'masterpiece'];
  const chances = {};
  for (const rarity of rarityNames) {
    const value = chanceInput[rarity];
    const number = typeof value === 'number' ? value
      : value && typeof value.toNumber === 'function' ? value.toNumber()
      : value == null ? 0 : Number(value);
    chances[rarity] = Number.isFinite(number)
      ? Math.min(100, Math.max(0, number)) : 0;
  }
  snapshot = rollRunRoster({ chances });
  try {
    records[nextKey] = snapshot.map(p => p.id);
    localStorage.setItem(STORAGE, JSON.stringify({ records }));
  } catch {}
}

function label(p) {
  return p.name + ' · ' + p.types.map(t => TYPE_LABELS[t] ?? t).join('/');
}
function renderBattle(state) {
  let card = document.getElementById(BATTLE_ID);
  const combat = state.combatState;
  const fighting = Boolean(combat?.isFighting && selectedPokemon && combat.enemyId === selectedPokemon.templateId);
  if (!fighting) {
    if (card) card.remove();
    return;
  }
  if (!card) {
    card = document.createElement('aside');
    card.id = BATTLE_ID;
    card.setAttribute('aria-label', '현재 포켓몬 전투');
    card.style.cssText = 'position:fixed;top:12px;right:12px;z-index:2147483646;min-width:160px;max-width:42vw;text-align:center;padding:10px;background:#f5f0e5;color:#222;border:2px solid #555;border-radius:8px;box-shadow:0 2px 12px #0008;font:14px sans-serif;pointer-events:none';
    const name = document.createElement('strong');
    name.dataset.field = 'name';
    name.style.cssText = 'display:block;font-size:17px';
    const img = document.createElement('img');
    img.alt = selectedPokemon.name;
    img.width = 112;
    img.height = 112;
    img.style.cssText = 'display:block;margin:auto;image-rendering:pixelated;object-fit:contain';
    const type = document.createElement('div');
    type.dataset.field = 'types';
    const hp = document.createElement('div');
    hp.dataset.field = 'hp';
    card.append(name, img, type, hp);
    document.body.append(card);
  }
  card.querySelector('[data-field=name]').textContent = selectedPokemon.name;
  card.querySelector('img').alt = selectedPokemon.name;
  const sprite = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/' + selectedPokemon.dex + '.png';
  if (card.querySelector('img').getAttribute('src') !== sprite) card.querySelector('img').src = sprite;
  card.querySelector('[data-field=types]').textContent = selectedPokemon.types.map(t => TYPE_LABELS[t] ?? t).join(' / ');
  const hp = combat.currentEnemyHp;
  const textHp = hp && typeof hp.toString === 'function' ? hp.toString() : String(hp ?? '?');
  card.querySelector('[data-field=hp]').textContent = 'HP ' + textHp;
}

function render() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const state = store.getState();
  loadOrRoll(state);
  renderBattle(state);
  root.replaceChildren();
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = expanded ? '포켓몬 후보 닫기' : '포켓몬 후보 (' + available(state).length + ')';
  button.setAttribute('aria-expanded',String(expanded));
  button.addEventListener('click',()=>{expanded=!expanded;render();});
  root.append(button);
  if (!expanded) return;
  const info=document.createElement('p');
  info.textContent='임시 배정 · 원작 전투/보상 사용 · 진화형 제외';
  root.append(info);
  const list=document.createElement('div');
  list.style.maxHeight='42vh';
  list.style.overflowY='auto';
  const options=available(state);
  if (!options.length) {
    const empty=document.createElement('p');
    empty.textContent='이번 회차에 등장 가능한 포켓몬 후보가 없습니다.';
    list.append(empty);
  }
  for(const p of options) {
    const row=document.createElement('button');
    row.type='button';
    row.textContent=label(p)+' — 전투';
    row.style.display='block';
    row.style.margin='4px 0';
    row.title='원작 적 전투 패턴: '+p.templateId;
    row.addEventListener('click',()=>{
      const now=store.getState();
      if (!now.availableSketches?.includes(p.templateId)) return;
      if (!originalCatalog[p.templateId]) return;
      selectedPokemon = p;
      now.challengeSketch(p.templateId);
      render();
    });
    list.append(row);
  }
  root.append(list);
}
let subscribed = false;
export function mountPokemonPanel(){
  let root=document.getElementById(ROOT_ID);
  if(!root){
    root=document.createElement('section');
    root.id=ROOT_ID;
    document.body.append(root);
  }
  root.setAttribute('aria-label','포켓몬 등장 후보');
  root.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483647;max-width:min(92vw,330px);padding:8px;background:#f5f0e5;color:#222;border:1px solid #555;box-shadow:0 2px 8px #0005;font:14px sans-serif;';
  render();
  if(subscribed) return;
  subscribed=true;
  let prevKey=currentKey(store.getState());
  let prevAvailable=(store.getState().availableSketches||[]).join('|');
  let prevCombat = store.getState().combatState;
  store.subscribe(state=>{
    const key=currentKey(state);
    const ids=(state.availableSketches||[]).join('|');
    if(key!==prevKey || ids!==prevAvailable){
      if (key !== prevKey) selectedPokemon = null;
      prevKey=key;
      prevAvailable=ids;
      render();
    }
    if(state.combatState !== prevCombat){
      prevCombat = state.combatState;
      renderBattle(state);
    }
  });
}
// The bootstrap in index.html loads this module and calls mountPokemonPanel.
// Avoid an unhandled auto-mount before the host can report errors.
