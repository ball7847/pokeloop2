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
const VICTORY_STORAGE = 'pokeloop2:pokemon-victories:v1';
const victoryRecords = (() => { try { const x = JSON.parse(localStorage.getItem(VICTORY_STORAGE)); return x && typeof x === 'object' && !Array.isArray(x) ? x : {}; } catch { return {}; } })();
function victoryKey(state) {
  return JSON.stringify([String(state.currentSaveSlot ?? 'browser'),
    String(state.multiverse?.currentUniverseId ?? 'original')]);
}
// Include records written by earlier prototypes under [slot, universe, redraw] keys.
function speciesVictories(slotKey, speciesId) {
  let total = 0;
  for (const [key, counts] of Object.entries(victoryRecords)) {
    try {
      const parsed = JSON.parse(key);
      if (Array.isArray(parsed) && parsed.length >= 2 &&
          parsed[0] === JSON.parse(slotKey)[0] &&
          parsed[1] === JSON.parse(slotKey)[1]) {
        const value = counts?.[speciesId];
        if (Number.isSafeInteger(value) && value > 0) total += value;
      }
    } catch {}
  }
  return total;
}
function creditVictory(slotKey, speciesId, count) {
  if (!speciesId || !Number.isSafeInteger(count) || count <= 0) return;
  const record = victoryRecords[slotKey] ||= {};
  record[speciesId] = (record[speciesId] || 0) + count;
  try { localStorage.setItem(VICTORY_STORAGE, JSON.stringify(victoryRecords)); } catch {}
  window.dispatchEvent(new Event('pokeloop:gallery-ready'));
}
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

function displayQuantity(value) {
  if (value == null) return '?';
  return typeof value.toString === 'function' ? value.toString() : String(value);
}
function originalRewards(template) {
  if (!template) return [];
  const stats = (template.rewards || []).map(r =>
    (r.statName || 'stat') + ' +' + displayQuantity(r.amount));
  const currencies = (template.currencyRewards || []).map(r =>
    (r.name || 'currency') + ' +' + displayQuantity(r.amount));
  return [...stats, ...currencies];
}

function battleEligibility(state, templateId) {
  if (state.combatState?.isFighting) return '전투 중';
  if (Number(state.challengeCooldownUntil || 0) > Date.now()) return '대기 중';
  if (state.combatDiscoveryAnimation?.blocking) return '전투 전환 중';
  const wins = Number(state.sketchVictories?.[templateId] || 0);
  const limit = Number(state.fundamentals?.maxVictories ?? Infinity);
  if (Number.isFinite(limit) && wins >= limit) return '승리 한도';
  return null;
}

// Shared gallery/panel entry point: species IDs stay separate from templates.
export function challengePokemonSpecies(speciesId) {
  const state = store.getState();
  loadOrRoll(state);
  const species = available(state).find(p => p.id === speciesId);
  if (!species || !originalCatalog[species.templateId] || battleEligibility(state, species.templateId)) return false;
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
      pokemonVictories: speciesVictories(victoryKey(state), p.id),
      maxVictories: Number(state.fundamentals?.maxVictories ?? 0),
      battleBlocked: battleEligibility(state, p.templateId),
      // Catalog rewards are unscaled base values; actual payouts still belong
      // to the original game's multiplier and progression calculations.
      baseRewards: originalRewards(originalCatalog[p.templateId]),
      baseStats: originalCatalog[p.templateId]?.stats ? {
        hp: displayQuantity(originalCatalog[p.templateId].stats.maxHp),
        attack: displayQuantity(originalCatalog[p.templateId].stats.attack),
      } : null,
    }));
  };
  window.__pokeloopChallengePokemon = challengePokemonSpecies;
}

let subscribed = false;
export function mountPokemonPanel(){
  // The original floating candidate panel is retired. This module remains the
  // encounter/record bridge consumed by the Gallery and combat widgets.
  document.getElementById(ROOT_ID)?.remove();
  loadOrRoll(store.getState());
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
  store.subscribe((state, previous)=>{
    const key=currentKey(state);
    const ids=(state.availableSketches||[]).join('|');
    const enemyId=state.combatState?.enemyId ?? null;
    const fighting = !!state.combatState?.isFighting;
    const battleChanged = enemyId !== lastBattleEnemyId || fighting !== lastFighting;
    // A positive original-template victory delta is the authoritative win signal.
    // Attribute it to the species pinned for the previous/current encounter,
    // before the store transitions to the next automatic target.
    if (key === prevKey && previous?.sketchVictories && activePokemon && lastFighting &&
        previous.combatState?.isFighting &&
        previous.combatState.enemyId === activePokemon.templateId) {
      const templateId = activePokemon.templateId;
      const oldWins = Number(previous.sketchVictories[templateId] || 0);
      const newWins = Number(state.sketchVictories?.[templateId] || 0);
      const increase = newWins - oldWins;
      // Ignore unrelated progression changes or save state replacement.
      if (Number.isSafeInteger(increase) && increase > 0 &&
          (state.combatState?.enemyId === templateId || !state.combatState?.isFighting)) {
        creditVictory(victoryKey(state), activePokemon.id, increase);
      }
    }
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
      window.dispatchEvent(new Event('pokeloop:gallery-ready'));
    }
  });
}
// The bootstrap loads this bridge before the Gallery consumes its roster.
