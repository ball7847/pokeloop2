import { CONFIG } from "./config.js";
import { expNeededForLevel } from "./state.js";

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function getPrototypeRewards(pokemon) {
  const stats = [...CONFIG.rewards.stats];
  let seed = hashString(pokemon.id);
  const count = 1 + (seed % 3);
  const selected = [];

  for (let i = 0; i < count; i++) {
    const index = seed % stats.length;
    selected.push(stats.splice(index, 1)[0]);
    seed = Math.imul(seed ^ (seed >>> 13), 1597334677) >>> 0;
  }

  const rarityMul = CONFIG.rewards.rarityMultiplier[pokemon.rarity] || 1;
  const distanceMul = 1 + Math.max(0, pokemon.distance - 1) * CONFIG.rewards.distanceGrowth;

  return selected.map(stat => {
    const base = CONFIG.rewards.baseAmounts[stat];
    const amount = base * rarityMul * distanceMul;
    return {
      stat,
      label: CONFIG.rewards.labels[stat],
      amount,
    };
  });
}

function applyRewards(ditto, rewards) {
  for (const reward of rewards) {
    ditto[reward.stat] += reward.amount;
  }
  if (rewards.some(r => r.stat === "maxHp")) {
    ditto.currentHp = Math.min(ditto.maxHp, ditto.currentHp + rewards.find(r => r.stat === "maxHp").amount);
  }
}

function gainExp(state, pokemon) {
  const rarityMul = CONFIG.rewards.rarityMultiplier[pokemon.rarity] || 1;
  const gained = Math.max(1, Math.round(CONFIG.rewards.expBase * rarityMul * (1 + pokemon.distance * 0.025)));
  state.ditto.exp += gained;
  const levelUps = [];

  while (state.ditto.exp >= state.ditto.expToNext) {
    state.ditto.exp -= state.ditto.expToNext;
    state.ditto.level += 1;
    state.ditto.expToNext = expNeededForLevel(state.ditto.level);

    // 프로토타입 레벨업 보너스. 이후 최종 성장 공식 확정 시 config/이 함수만 교체.
    state.ditto.maxHp += 2;
    state.ditto.attack += 0.3;
    state.ditto.defense += 0.2;
    state.ditto.spAttack += 0.3;
    state.ditto.spDefense += 0.2;
    state.ditto.speed += 0.15;
    state.ditto.currentHp = state.ditto.maxHp;
    levelUps.push(state.ditto.level);
  }

  return { gained, levelUps };
}

export function processVictory(state, pokemon) {
  state.totalKills += 1;
  state.run.killCounts[pokemon.id] = (state.run.killCounts[pokemon.id] || 0) + 1;

  const rewards = getPrototypeRewards(pokemon);
  applyRewards(state.ditto, rewards);
  const exp = gainExp(state, pokemon);

  let progressChange = null;
  if (pokemon.rarity !== "흔함") {
    const oldProgress = state.rarityProgress[pokemon.rarity] ?? 0;
    if (pokemon.distance > oldProgress) {
      state.rarityProgress[pokemon.rarity] = pokemon.distance;
      progressChange = { rarity: pokemon.rarity, from: oldProgress, to: pokemon.distance };
    }
  }

  return { rewards, exp, progressChange };
}

export function formatReward(reward) {
  const digits = reward.stat === "attacksPerSecond" ? 4 : reward.stat === "maxHp" ? 2 : 3;
  return `${reward.label} +${reward.amount.toFixed(digits)}`;
}
