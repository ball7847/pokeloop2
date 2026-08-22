import { CONFIG, chanceForPokemon } from "./config.js";

function pickRandom(array, rng = Math.random) {
  return array[Math.floor(rng() * array.length)];
}

export function sortPoolForExploration(pool) {
  return [...pool].sort((a, b) =>
    (a.progressionOrder ?? Number.MAX_SAFE_INTEGER) - (b.progressionOrder ?? Number.MAX_SAFE_INTEGER) ||
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

  // 흔함은 기존 규칙 유지: 거리 1~50마다 후보 중 정확히 1종을 뽑는다.
  for (let distance = 1; distance <= CONFIG.rarity["흔함"].maxDistance; distance++) {
    const candidates = commonByDistance.get(distance) || [];
    if (!candidates.length) throw new Error(`흔함 거리 ${distance}에 후보가 없습니다.`);
    pool.push(pickRandom(candidates, rng));
  }

  // 안흔함 이상도 기존 Distance Decay 출현 판정을 그대로 사용한다.
  for (const p of pokemonList) {
    if (p.rarity === "흔함") continue;
    const progress = rarityProgress[p.rarity] ?? 0;
    const chance = chanceForPokemon(p, progress);
    if (rng() < chance) pool.push(p);
  }

  // 출현 여부와 공개 순서는 별개다.
  // 이번 런에 실제 등장한 포켓몬만 미리 부여된 통합 progression line 순서로 정렬한다.
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
