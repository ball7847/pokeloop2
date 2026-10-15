import { baseEffectiveness, assimilationMultiplier } from '../pokeloop/core.js';

/**
 * Non-invasive typed-hit multiplier for the ORIGINAL automatic-attack loop.
 * This returns a multiplier only; the combat resolver remains responsible for
 * its existing crit/armor/absorb/status/counter ordering and Decimal math.
 *
 * Player (Ditto) auto-attacks use its fixed Normal-type attack. No move slots.
 * An enemy with no approved Pokémon assignment returns neutral multiplier,
 * so every unconverted Rejected Draft enemy stays unchanged.
 *
 * Existing authoritative core rules:
 * - Immunities are 0.25×, not zero.
 * - Assimilation modifies attack and defense multiplicatively.
 */
export function originalAutoAttackTypeMultiplier({
  attackerSide,
  enemyPokemonTypes = null,
  dittoAssimilation = null,
}) {
  if (attackerSide !== 'player' && attackerSide !== 'enemy') {
    throw new TypeError('attackerSide must be player or enemy');
  }
  if (enemyPokemonTypes == null) return 1;
  if (!Array.isArray(enemyPokemonTypes) || enemyPokemonTypes.length < 1 ||
      enemyPokemonTypes.length > 2 ||
      new Set(enemyPokemonTypes).size !== enemyPokemonTypes.length) {
    throw new TypeError('Expected one or two distinct enemy Pokémon types');
  }
  if (dittoAssimilation == null) return 1; // Not yet unlocked/configured.
  if (attackerSide === 'player') {
    return baseEffectiveness('normal', enemyPokemonTypes) *
      assimilationMultiplier(dittoAssimilation, enemyPokemonTypes, 'attack');
  }
  // Enemy auto-attack has not been assigned one attack type per Pokémon.
  // No guessed type is allowed to change combat damage.
  return 1;
}

/** Apply multiplier without converting a huge Decimal HP/damage to Number. */
export function scaleOriginalHitDamage(originalDamage, multiplier) {
  if (!Number.isFinite(multiplier) || multiplier < 0) {
    throw new RangeError('Invalid hit multiplier');
  }
  if (!originalDamage || typeof originalDamage.times !== 'function') {
    throw new TypeError('Original hit damage must support Decimal.times()');
  }
  return multiplier === 1 ? originalDamage : originalDamage.times(multiplier);
}
