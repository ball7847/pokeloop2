/**
 * Original primary-hit damage variance (Aa in data-skill-tree bundle).
 * Keeps arbitrary-precision Decimal operations and draws random only
 * when the minimum and maximum damage percentages differ.
 */
export function calculateDamageVariance(minDamage, maxDamage, random = Math.random) {
  const minFactor = minDamage.div(100);
  const maxFactor = maxDamage.div(100);
  const isRandom = !minFactor.eq(maxFactor);
  const factor = isRandom
    ? minFactor.plus(maxFactor.minus(minFactor).times(random()))
    : minFactor;
  return { factor, isRandom };
}
