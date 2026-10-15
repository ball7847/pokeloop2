/**
 * Player basic-attack timing extracted from the original combat tick.
 * Original source: assets/game-store-DKXacG7P.js
 * Expression: baseIntervalMs * (1 + Slow*.001) / (1 + Haste*.001)
 *             * (BananaSlip>0 ? 2 : 1) * flowFactor
 *
 * Caller supplies the original 'v/T' base interval, so all other
 * skill/stat calculations remain in the original game for now.
 */
export function playerAttackIntervalMs({
  baseIntervalMs,
  slowStacks = 0,
  hasteStacks = 0,
  bananaSlipStacks = 0,
  inFlowState = false,
  playerAttackCount = 0,
  flowStateLevel = 0,
  glossaryUnlocked = false,
}) {
  let flowFactor = 1;
  if (inFlowState && playerAttackCount === 0 && glossaryUnlocked) {
    flowFactor = Math.max(0.1, 1 - flowStateLevel * 0.01);
  }
  return baseIntervalMs *
    (1 + slowStacks * 0.001) *
    (1 / (1 + hasteStacks * 0.001)) *
    (bananaSlipStacks > 0 ? 2 : 1) *
    flowFactor;
}
