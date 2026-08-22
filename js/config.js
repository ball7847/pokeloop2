export const CONFIG = Object.freeze({
  save: {
    key: "metamonSimulatorSave",
    version: 1,
    autosaveMs: 5000,
  },

  rarityOrder: ["흔함", "안흔함", "희귀한", "환상적인", "전설적인", "신적인", "초월적인"],

  rarity: {
    "흔함":      { baseChance: 1,      decay: 1,    maxDistance: 50, combatScale: 1.00 },
    "안흔함":    { baseChance: 0.10,   decay: 1.10, maxDistance: 30, combatScale: 1.15 },
    "희귀한":    { baseChance: 0.05,   decay: 1.15, maxDistance: 20, combatScale: 1.40 },
    "환상적인":  { baseChance: 0.02,   decay: 1.10, maxDistance: 30, combatScale: 1.80 },
    "전설적인":  { baseChance: 0.005,  decay: 1.25, maxDistance: 10, combatScale: 2.50 },
    "신적인":    { baseChance: 0.0015, decay: 1.50, maxDistance: 7,  combatScale: 3.50 },
    "초월적인":  { baseChance: 0.0003, decay: 3.00, maxDistance: 4,  combatScale: 5.50 },
  },

  progression: {
    // Rejected Draft 참고형: 시작 진행도 0, 거리 1은 Decay 없음.
    initialProgress: 0,
  },

  metaProgression: {
    explorationBase: 3,
    explorationPerLevel: 1,
    absorptionBase: 10,
    absorptionPerLevel: 10,
    explorationUpgrade: { baseCost: 25, costGrowth: 2.0 },
    absorptionUpgrade: { baseCost: 50, costGrowth: 2.0 },
    // Rejected Draft의 초반 Auto Retry(50 Graphite)를 연구 포인트 체계로 변환.
    autoRepeatUnlockCost: 50,
  },

  ditto: {
    level: 1,
    maxLevel: 100,
    maxHp: 100,
    attack: 10,
    defense: 8,
    spAttack: 10,
    spDefense: 8,
    speed: 10,
    attacksPerSecond: 1.0,
  },

  battle: {
    fullHealBeforeBattle: false,
    victoryRecoverySeconds: 0,
    deathRecoverySeconds: 10,
    fleeRecoverySeconds: 5,
    enemyBaseHp: 28,
    enemyBaseOffense: 7,
    enemyBaseDefense: 4,
    enemyBaseSpeed: 8,
    distanceHpGrowth: 0.055,
    distanceOffenseGrowth: 0.025,
    distanceDefenseGrowth: 0.018,
    distanceSpeedGrowth: 0.012,
    minIntervalMs: 240,
    baseIntervalMs: 1600,
    repeatDelayMs: 450,
    playerDefenseFactor: 0.38,
    enemyDefenseFactor: 0.34,
  },

  rewards: {
    stats: ["maxHp", "attack", "defense", "spAttack", "spDefense", "speed", "attacksPerSecond"],
    labels: {
      maxHp: "HP",
      attack: "공격",
      defense: "방어",
      spAttack: "특공",
      spDefense: "특방",
      speed: "스피드",
      attacksPerSecond: "공격속도",
    },
    baseAmounts: {
      maxHp: 1.20,
      attack: 0.16,
      defense: 0.14,
      spAttack: 0.16,
      spDefense: 0.14,
      speed: 0.10,
      attacksPerSecond: 0.002,
    },
    rarityMultiplier: {
      "흔함": 1,
      "안흔함": 1.2,
      "희귀한": 1.45,
      "환상적인": 1.8,
      "전설적인": 2.4,
      "신적인": 3.2,
      "초월적인": 4.5,
    },
    distanceGrowth: 0.018,
    expBase: 3,
    researchBase: 1,
    researchDistanceGrowth: 0.012,
    // Rejected Draft 기본 Reward Decay 형태: n번째 승리 보상 = 1/n.
    repeatDecayFactor: 1.0,
  },

  specialForms: {
    enabled: false,
    replacementChance: 0.01,
  },
});

export function chanceForPokemon(pokemon, progress) {
  if (pokemon.rarity === "흔함") return 1;
  const rarity = CONFIG.rarity[pokemon.rarity];
  if (!rarity) return 0;
  const exponent = Math.max(0, pokemon.distance - progress - 1);
  return rarity.baseChance / Math.pow(rarity.decay, exponent);
}

export function explorationRangeForLevel(level = 0) {
  return CONFIG.metaProgression.explorationBase + Math.max(0, level) * CONFIG.metaProgression.explorationPerLevel;
}

export function absorptionLimitForLevel(level = 0) {
  return CONFIG.metaProgression.absorptionBase + Math.max(0, level) * CONFIG.metaProgression.absorptionPerLevel;
}

export function metaUpgradeCost(type, level = 0) {
  const rule = type === "exploration"
    ? CONFIG.metaProgression.explorationUpgrade
    : CONFIG.metaProgression.absorptionUpgrade;
  return Math.round(rule.baseCost * Math.pow(rule.costGrowth, Math.max(0, level)));
}
