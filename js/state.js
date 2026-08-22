import { CONFIG } from "./config.js";

export function totalExpForLevel(level) {
  const capped = Math.max(1, Math.min(CONFIG.ditto.maxLevel, Number(level) || 1));
  return capped <= 1 ? 0 : Math.pow(capped, 3);
}

export function expNeededForLevel(level) {
  const current = Math.max(1, Math.min(CONFIG.ditto.maxLevel, Number(level) || 1));
  if (current >= CONFIG.ditto.maxLevel) return null;
  return Math.pow(current + 1, 3);
}

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
    resources: {
      researchPoints: 0,
    },
    upgrades: {
      explorationLevel: 0,
      absorptionLevel: 0,
      autoRepeatUnlocked: false,
    },
    ditto: {
      level: CONFIG.ditto.level,
      exp: 0, // 누적 EXP. Lv.2=8, Lv.50=125000, Lv.100=1000000.
      expModelVersion: 2,
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
      revealedCount: 0,
      selectedPokemonId: null,
      battleLog: [],
      recentEvents: [],
    },
  };
}

function migrateLegacyExp(ditto) {
  if (ditto.expModelVersion === 2) return ditto;
  const level = Math.max(1, Math.min(CONFIG.ditto.maxLevel, Number(ditto.level) || 1));
  // 이전 프로토타입의 exp는 '현재 레벨 안에서 쌓인 EXP'였으므로,
  // 기존 레벨은 유지하고 현재 레벨의 새 누적 임계값에 더해 보존한다.
  const legacyWithinLevelExp = Math.max(0, Number(ditto.exp) || 0);
  const cumulative = Math.min(
    Math.pow(CONFIG.ditto.maxLevel, 3),
    totalExpForLevel(level) + legacyWithinLevelExp
  );
  return {
    ...ditto,
    level,
    exp: cumulative,
    expModelVersion: 2,
    expToNext: level >= CONFIG.ditto.maxLevel ? null : expNeededForLevel(level),
  };
}

export function normalizeState(raw) {
  if (!raw || typeof raw !== "object") return createDefaultState();
  if (raw.version !== CONFIG.save.version) return createDefaultState();

  const base = createDefaultState();
  const rawDitto = migrateLegacyExp({ ...base.ditto, ...(raw.ditto || {}) });
  const merged = {
    ...base,
    ...raw,
    rarityProgress: { ...base.rarityProgress, ...(raw.rarityProgress || {}) },
    resources: { ...base.resources, ...(raw.resources || {}) },
    upgrades: { ...base.upgrades, ...(raw.upgrades || {}) },
    ditto: rawDitto,
    run: { ...base.run, ...(raw.run || {}) },
  };
  merged.ditto.level = Math.max(1, Math.min(CONFIG.ditto.maxLevel, merged.ditto.level));
  merged.ditto.exp = Math.max(0, Math.min(Math.pow(CONFIG.ditto.maxLevel, 3), merged.ditto.exp));
  merged.ditto.expToNext = merged.ditto.level >= CONFIG.ditto.maxLevel ? null : expNeededForLevel(merged.ditto.level);
  merged.ditto.currentHp = Math.min(merged.ditto.currentHp, merged.ditto.maxHp);
  if (!Array.isArray(merged.run.battleLog)) merged.run.battleLog = [];
  if (!Array.isArray(merged.run.recentEvents)) merged.run.recentEvents = [];
  return merged;
}
