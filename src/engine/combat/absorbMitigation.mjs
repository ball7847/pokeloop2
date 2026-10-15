/**
 * Original primary-hit Absorb stage, after armor subtraction.
 * Percent is capped at 100 but not clamped at zero because the original
 * resolver only enters this stage when absorb.gt(0).
 * Uses Decimal end-to-end and reports absorbed damage for combat logs.
 */
export function applyAbsorbMitigation(damage, absorb, Decimal) {
  const ratio = Decimal.min(absorb, 100).div(100);
  const prevented = damage.times(ratio);
  return { remaining: damage.minus(prevented), prevented };
}
