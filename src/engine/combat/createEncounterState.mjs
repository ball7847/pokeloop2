/**
 * PokéLoop 2 combat encounter boundary.
 *
 * This is an isolated, side-effect-free model of the original Rejected Draft
 * challengeSketch encounter initialization. It is NOT wired into the current
 * minified bundle yet.
 *
 * Original behavior: a chained fight may carry player HP and status stacks.
 * PokéLoop rule: carry remaining HP on chained fights, but reset ALL temporary
 * statuses at the beginning of EVERY encounter.
 *
 * Large-number HP objects (Decimal / break_infinity-style values) are passed
 * through unchanged; this module does not convert them to Number.
 */

export function createEncounterState({
  enemyId,
  encounterId,
  startedAt,
  playerMaxHp,
  enemyMaxHp,
  previousCombat = null,
  chained = false,
  lastVictory = previousCombat?.lastVictory ?? null,
  maxFlowGapMs = 5000,
}) {
  if (typeof enemyId !== 'string' || !enemyId) {
    throw new TypeError('enemyId must be a nonempty string');
  }
  if (encounterId == null || startedAt == null) {
    throw new TypeError('encounterId and startedAt are required');
  }
  if (playerMaxHp == null || enemyMaxHp == null) {
    throw new TypeError('playerMaxHp and enemyMaxHp are required');
  }

  // Follow the original HP carry-over policy, independently of status reset.
  let currentPlayerHp = playerMaxHp;
  if (chained && previousCombat?.currentPlayerHp != null) {
    const hp = previousCombat.currentPlayerHp;
    const isPositive = typeof hp.gt === 'function' ? hp.gt(0) : hp > 0;
    if (isPositive) currentPlayerHp = hp;
  }

  return {
    isFighting: true,
    encounterId,
    enemyId,
    lastVictory,
    lastEnemyDefeatAnimation: null,
    currentPlayerHp,
    currentEnemyHp: enemyMaxHp,
    enemyMaxHp,
    lastPlayerAttackTime: startedAt,
    lastEnemyAttackTime: startedAt,
    lastRegenTick: startedAt,
    lastStatusTick: startedAt,
    startTime: startedAt,
    statuses: { player: {}, enemy: {} },
    pendingCombatEffects: [],
    isPlayerDefeated: false,
    playerAttackCount: 0,
    isInFlowState:
      Boolean(chained && lastVictory != null && startedAt - lastVictory.time < maxFlowGapMs),
    featBattleFlags: 0,
    enemyKilledByEnergyWave: false,
  };
}
