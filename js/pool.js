import { CONFIG, chanceForPokemon } from "./config.js";

function pickRandom(array, rng = Math.random) {
  return array[Math.floor(rng() * array.length)];
}

export function sortPoolForExploration(pool) {
  return [...pool].sort((a, b) =>
    a.distance - b.distance ||
    CONFIG.rarityOrder.indexOf(a.rarity) - CONFIG.rarityOrder.indexOf(b.rarity) ||
    a.dex - b.dex ||
    a.id.localeCompare(b.id)
  );
}

export function generateRunPool(pokemonList, rarityProgress, rng = Math.random) {
  const pool = [];
  const common = pokemonList.filter(p => p.rarity === "흔함");
  const commonByDistance = new Map();

  for (const p of common) {
    if (!commonByDistance.has(p.distance)) commonByDistance.set(p.distance, []);
    commonByDistance.get(p.distance).push(p);
  }

  for (let distance = 1; distance <= CONFIG.rarity["흔함"].maxDistance; distance++) {
    const candidates = commonByDistance.get(distance) || [];
    if (!candidates.length) throw new Error(`흔함 거리 ${distance}에 후보가 없습니다.`);
    pool.push(pickRandom(candidates, rng));
  }

  for (const p of pokemonList) {
    if (p.rarity === "흔함") continue;
    const progress = rarityProgress[p.rarity] ?? 0;
    const chance = chanceForPokemon(p, progress);
    if (rng() < chance) pool.push(p);
  }

  return sortPoolForExploration(pool);
}

export function summarizePool(pool) {
  const result = Object.fromEntries(CONFIG.rarityOrder.map(r => [r, 0]));
  for (const p of pool) result[p.rarity] = (result[p.rarity] || 0) + 1;
  return result;
}

export function getAppearanceChance(pokemon, rarityProgress) {
  if (pokemon.rarity === "흔함") return null;
  return chanceForPokemon(pokemon, rarityProgress[pokemon.rarity] ?? 0);
}
