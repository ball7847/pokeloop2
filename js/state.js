import { CONFIG } from "./config.js";

export function createDefaultState() {
  const rarityProgress = {};
  for (const rarity of CONFIG.rarityOrder) {
    if (rarity !== "흔함") rarityProgress[rarity] = CONFIG.progression.initialProgress;
  }

  return {
    version: CONFIG.save.version,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    rebirthCount: 0,
    totalKills: 0,
    rarityProgress,
    ditto: {
      level: CONFIG.ditto.level,
      exp: 0,
      expToNext: expNeededForLevel(CONFIG.ditto.level),
      maxHp: CONFIG.ditto.maxHp,
      currentHp: CONFIG.ditto.maxHp,
      attack: CONFIG.ditto.attack,
      defense: CONFIG.ditto.defense,
      spAttack: CONFIG.ditto.spAttack,
      spDefense: CONFIG.ditto.spDefense,
      speed: CONFIG.ditto.speed,
      attacksPerSecond: CONFIG.ditto.attacksPerSecond,
    },
    run: {
      id: 0,
      startedAt: null,
      poolIds: [],
      killCounts: {},
      selectedPokemonId: null,
      battleLog: [],
    },
  };
}

export function expNeededForLevel(level) {
  return Math.max(1, Math.round(CONFIG.ditto.expToLevelBase * Math.pow(CONFIG.ditto.expToLevelGrowth, level - 1)));
}

export function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return createDefaultState();
  if (raw.version !== CONFIG.save.version) return createDefaultState();

  const base = createDefaultState();
  const merged = {
    ...base,
    ...raw,
    rarityProgress: { ...base.rarityProgress, ...(raw.rarityProgress || {}) },
    ditto: { ...base.ditto, ...(raw.ditto || {}) },
    run: { ...base.run, ...(raw.run || {}) },
  };
  merged.ditto.currentHp = Math.min(merged.ditto.currentHp, merged.ditto.maxHp);
  return merged;
}
