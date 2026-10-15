/**
 * Extracted from Rejected Draft EnergyWave damage calculations.
 * Uses the game's arbitrary-precision Decimal constructor rather than Number.
 * This is a multiplier only, not the entire damage pipeline.
 */
export function inspirationMultiplier(stacks, Decimal) {
  return new Decimal(1).plus(new Decimal(stacks).times(0.01));
}
