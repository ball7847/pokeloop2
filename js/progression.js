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

  return selected.map(stat => ({
    stat,
    label: CONFIG.rewards.labels[stat],
    amount: CONFIG.rewards.baseAmounts[stat] * rarityMul * distanceMul,
  }));
}

export function getRewardMultiplier(previousKills) {
  const kills = Math.max(0, Number(previousKills) || 0);
  const factor = Math.max(0, CONFIG.rewards.repeatDecayFactor ?? 1);
  if (factor === 0) return 1;
  return 1 / (1 + kills * factor);
}

export function getEffectiveRewards(pokemon, previousKills, absorptionLimit = Infinity) {
  if (previousKills >= absorptionLimit) return [];
  const multiplier = getRewardMultiplier(previousKills);
  return getPrototypeRewards(pokemon).map(reward => ({
    ...reward,
    baseAmount: reward.amount,
    amount: reward.amount * multiplier,
    multiplier,
  }));
}

function applyRewards(ditto, rewards) {
  for (const reward of rewards) ditto[reward.stat] += reward.amount;
  const hpReward = rewards.find(r => r.stat === "maxHp");
  if (hpReward) ditto.currentHp = Math.min(ditto.maxHp, ditto.currentHp + hpReward.amount);
}

function gainExp(state, pokemon, rewardMultiplier = 1) {
  const rarityMul = CONFIG.rewards.rarityMultiplier[pokemon.rarity] || 1;
  const raw = CONFIG.rewards.expBase * rarityMul * (1 + pokemon.distance * 0.025);
  const gainedRaw = Math.max(0, Math.round(raw * rewardMultiplier));
  const maxExp = Math.pow(CONFIG.ditto.maxLevel, 3);
  const before = state.ditto.exp;
  state.ditto.exp = Math.min(maxExp, state.ditto.exp + gainedRaw);
  const gained = state.ditto.exp - before;
  const levelUps = [];

  while (state.ditto.level < CONFIG.ditto.maxLevel) {
    const nextThreshold = expNeededForLevel(state.ditto.level);
    if (nextThreshold == null || state.ditto.exp < nextThreshold) break;
    state.ditto.level += 1;
    state.ditto.maxHp += 2;
    state.ditto.attack += 0.3;
    state.ditto.defense += 0.2;
    state.ditto.spAttack += 0.3;
    state.ditto.spDefense += 0.2;
    state.ditto.speed += 0.15;
    state.ditto.currentHp = state.ditto.maxHp;
    levelUps.push(state.ditto.level);
  }

  state.ditto.expToNext = state.ditto.level >= CONFIG.ditto.maxLevel
    ? null
    : expNeededForLevel(state.ditto.level);

  return { gained, levelUps };
}

function gainResearch(state, pokemon, rewardMultiplier = 1) {
  const rarityMul = CONFIG.rewards.rarityMultiplier[pokemon.rarity] || 1;
  const raw = CONFIG.rewards.researchBase * rarityMul * (1 + pokemon.distance * CONFIG.rewards.researchDistanceGrowth);
  const gained = Math.max(0, raw * rewardMultiplier);
  state.resources.researchPoints += gained;
  return gained;
}

export function processVictory(state, pokemon, absorptionLimit = Infinity) {
  const previousKills = state.run.killCounts[pokemon.id] || 0;
  const rewardMultiplier = getRewardMultiplier(previousKills);
  const withinAbsorptionLimit = previousKills < absorptionLimit;
  const firstVictory = previousKills === 0;

  state.totalKills += 1;
  state.run.killCounts[pokemon.id] = previousKills + 1;

  const rewards = withinAbsorptionLimit
    ? getEffectiveRewards(pokemon, previousKills, absorptionLimit)
    : [];
  applyRewards(state.ditto, rewards);

  // 흡수 한계 이후에도 EXP만 계속 획득하며 반복 점감은 계속 적용된다.
  const exp = gainExp(state, pokemon, rewardMultiplier);
  const research = withinAbsorptionLimit
    ? gainResearch(state, pokemon, rewardMultiplier)
    : 0;
  const newlyAbsorbed = withinAbsorptionLimit && state.run.killCounts[pokemon.id] >= absorptionLimit;

  let progressChange = null;
  if (pokemon.rarity !== "흔함") {
    const oldProgress = state.rarityProgress[pokemon.rarity] ?? 0;
    if (pokemon.distance > oldProgress) {
      state.rarityProgress[pokemon.rarity] = pokemon.distance;
      progressChange = { rarity: pokemon.rarity, from: oldProgress, to: pokemon.distance };
    }
  }

  return {
    rewards,
    exp,
    research,
    progressChange,
    rewardMultiplier,
    previousKills,
    newlyAbsorbed,
    firstVictory,
    withinAbsorptionLimit,
  };
}

export function formatReward(reward) {
  const digits = reward.stat === "attacksPerSecond" ? 4 : reward.stat === "maxHp" ? 2 : 3;
  return `${reward.label} +${reward.amount.toFixed(digits)}`;
}
