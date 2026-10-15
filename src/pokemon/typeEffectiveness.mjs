/**
 * PokéLoop type policy. The previously agreed game-specific rules are
 * already implemented in ../pokeloop/core.js. Do not copy another chart.
 *
 * IMPORTANT: In PokéLoop an original Pokémon immunity is 0.25×, not 0×.
 * The normal attack loop is preserved; no four-move selection.
 */
import { TYPES, baseEffectiveness } from '../pokeloop/core.js';

export const POKEMON_TYPES = Object.freeze([...TYPES]);
const known = new Set(POKEMON_TYPES);

export function typeEffectiveness(attackType, defenderTypes) {
  if (!known.has(attackType)) {
    throw new TypeError(`Unknown attacking type: ${attackType}`);
  }
  if (!Array.isArray(defenderTypes) || defenderTypes.length < 1 ||
      defenderTypes.length > 2 ||
      new Set(defenderTypes).size !== defenderTypes.length ||
      defenderTypes.some(type => !known.has(type))) {
    throw new TypeError('Expected one or two distinct defender types');
  }
  return baseEffectiveness(attackType, defenderTypes);
}
