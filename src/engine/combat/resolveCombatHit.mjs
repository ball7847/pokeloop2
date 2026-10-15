/**
 * Combat damage-resolution boundary.
 *
 * The original resolveAttack implementation is exported by the compiled
 * data-skill-tree bundle (alias rn in game-store). This adapter deliberately
 * delegates unchanged and does NOT add a type multiplier yet.
 *
 * Future type-effectiveness integration can be introduced here only after
 * documenting all attack sources, reflection/counters and decimal semantics.
 */
export function resolveCombatHit(resolveOriginalAttack, ...originalArguments) {
  return resolveOriginalAttack(...originalArguments);
}
