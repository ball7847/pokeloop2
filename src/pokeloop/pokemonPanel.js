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
let activePokemon = null;
const templateCursor = new Map();
let lastBattleEnemyId = null;
let lastFighting = false;
if (typeof window !== "undefined") window.__pokeloopBattleRevision = 0;
function signalBattleIdentityChange() { if (typeof window !== "undefined") window.__pokeloopBattleRevision = (window.__pokeloopBattleRevision || 0) + 1; }


function currentKey(state) {
  const slot = state.currentSaveSlot ?? 'browser';
  const universe = state.multiverse?.currentUniverseId ?? 'original';
  return JSON.stringify([String(slot), String(universe), String(state.redrawCount ?? 0)]);
}
function available(state) {
  const ids = new Set(state.availableSketches || []);
  return (snapshot || []).filter(p => ids.has(p.templateId));
}
function loadOrRoll(state) {
  const nextKey = currentKey(state);
  if (runKey === nextKey && snapshot) return;
  runKey = nextKey;
  selectedPokemon = null;
  activePokemon = null;
  templateCursor.clear();
  lastBattleEnemyId = null;
  lastFighting = false;
  signalBattleIdentityChange();
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

// The original React battle widget reads this resolver when rendering the
// enemy's name and sprite. Keep identity separate from combat template IDs.
if (typeof window !== 'undefined') {
  window.__pokeloopBattleSpecies = (enemyId) => {
    if (!enemyId) return null;
    const state = store.getState();
    loadOrRoll(state);
    // Only display Pokémon during the matching active encounter.
    if (!state.combatState?.isFighting || state.combatState.enemyId !== enemyId) return null;
    if (!state.availableSketches?.includes(enemyId)) return null;
    const match = activePokemon?.templateId === enemyId &&
      snapshot?.some(p => p.id === activePokemon.id) ? activePokemon : null;
    return match ? { ...match, battleLabel: label(match) } : null;
  };
}

// Shared gallery/panel entry point: species IDs stay separate from templates.
export function challengePokemonSpecies(speciesId) {
  const state = store.getState();
  loadOrRoll(state);
  const species = available(state).find(p => p.id === speciesId);
  if (!species || !originalCatalog[species.templateId]) return false;
  selectedPokemon = species;
  activePokemon = species;
  signalBattleIdentityChange();
  state.challengeSketch(species.templateId);
  const after = store.getState();
  if (!after.combatState?.isFighting || after.combatState.enemyId !== species.templateId) {
    selectedPokemon = null;
    activePokemon = null;
    signalBattleIdentityChange();
    return false;
  }
  return true;
}
if (typeof window !== 'undefined') {
  window.__pokeloopGalleryRoster = () => {
    const state = store.getState();
    loadOrRoll(state);
    return available(state).map(p => ({
      id: p.id, dex: p.dex, name: p.name, rarity: p.rarity,
      types: p.types.map(t => TYPE_LABELS[t] ?? t),
      templateId: p.templateId,
      // Original victories are shared by every Pokémon using this template.
      // Do not represent them as per-species records.
      templateVictories: state.sketchVictories?.[p.templateId] ?? 0,
    }));
  };
  window.__pokeloopChallengePokemon = challengePokemonSpecies;
}

function label(p) {
  return p.name + ' · ' + p.types.map(t => TYPE_LABELS[t] ?? t).join('/');
}
function render() {
  const root = document.getElementById(ROOT_ID);
  if (!root) return;
  const state = store.getState();
  loadOrRoll(state);
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
      challengePokemonSpecies(p.id);
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
  window.dispatchEvent(new Event('pokeloop:gallery-ready'));
  if(subscribed) return;
  subscribed=true;
  let prevKey=currentKey(store.getState());
  let prevAvailable=(store.getState().availableSketches||[]).join('|');
  lastBattleEnemyId = store.getState().combatState?.enemyId ?? null;
  lastFighting = !!store.getState().combatState?.isFighting;
  if (lastFighting && lastBattleEnemyId) {
    const first = available(store.getState()).find(p => p.templateId === lastBattleEnemyId);
    activePokemon = first || null;
    if (first) templateCursor.set(lastBattleEnemyId, 1);
    signalBattleIdentityChange();
  }
  store.subscribe(state=>{
    const key=currentKey(state);
    const ids=(state.availableSketches||[]).join('|');
    const enemyId=state.combatState?.enemyId ?? null;
    const fighting = !!state.combatState?.isFighting;
    const battleChanged = enemyId !== lastBattleEnemyId || fighting !== lastFighting;
    // Choose once per active encounter, not on every render or damage tick.
    // When species share an original template, cycle deterministically through
    // that Redraw's eligible species without running a new rarity roll.
    if (battleChanged) {
      if (!fighting) {
        selectedPokemon = null;
        activePokemon = null;
      } else if (selectedPokemon?.templateId === enemyId &&
          snapshot?.some(p => p.id === selectedPokemon.id)) {
        activePokemon = selectedPokemon;
      } else {
        selectedPokemon = null;
        const candidates = available(state).filter(p => p.templateId === enemyId);
        const cursor = templateCursor.get(enemyId) || 0;
        activePokemon = candidates.length ? candidates[cursor % candidates.length] : null;
        if (candidates.length) templateCursor.set(enemyId, cursor + 1);
      }
      signalBattleIdentityChange();
    }
    lastBattleEnemyId = enemyId;
    lastFighting = fighting;
    if (key!==prevKey || ids!==prevAvailable){
      if (key !== prevKey || (selectedPokemon && !state.availableSketches?.includes(selectedPokemon.templateId))) {
        selectedPokemon = null;
        activePokemon = null;
        signalBattleIdentityChange();
      }
      prevKey=key;
      prevAvailable=ids;
      render();
    }
  });
}
// The bootstrap in index.html loads this module and calls mountPokemonPanel.
// Avoid an unhandled auto-mount before the host can report errors.
