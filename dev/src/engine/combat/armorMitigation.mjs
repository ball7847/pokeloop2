/**
 * Extracted from primary-hit function Aa, after Block and Surrealism.
 * All inputs and returns use original arbitrary-precision Decimal objects.
 * Compute effective armor separately to preserve immunity/Surrealism logic.
 */
export function applyArmorMitigation(damage, effectiveArmor, Decimal) {
  return Decimal.max(0, effectiveArmor.eq(0)
    ? damage
    : damage.minus(effectiveArmor));
}
