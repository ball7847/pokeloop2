/**
 * Original enemy attack scheduling formula from the combat tick.
 * Input baseIntervalMs is the original G/T; neither underlying stat is changed.
 */
export function enemyAttackIntervalMs({
  baseIntervalMs,
  slowStacks = 0,
  hasteStacks = 0,
  bananaSlipStacks = 0,
}) {
  return baseIntervalMs *
    (1 + slowStacks * 0.001) *
    (1 / (1 + hasteStacks * 0.001)) *
    (bananaSlipStacks > 0 ? 2 : 1);
}
