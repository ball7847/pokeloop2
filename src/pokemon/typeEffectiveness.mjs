/**
 * Pokémon type effectiveness (18 modern types).
 * Rows are attacking move types. Values are defender type effectiveness.
 * Unspecified matchups are neutral (1).
 * This module does not alter original Rejected Draft combat until an
 * explicit move-type damage integration is implemented and tested.
 */
export const POKEMON_TYPES = Object.freeze([
  'normal','fire','water','electric','grass','ice','fighting','poison',
  'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
]);

// [super-effective, resisted, immune]. Entries use English type IDs.
const rules = {
  normal:   [[], ['rock','steel'], ['ghost']],
  fire:     [['grass','ice','bug','steel'], ['fire','water','rock','dragon'], []],
  water:    [['fire','ground','rock'], ['water','grass','dragon'], []],
  electric: [['water','flying'], ['electric','grass','dragon'], ['ground']],
  grass:    [['water','ground','rock'], ['fire','grass','poison','flying','bug','dragon','steel'], []],
  ice:      [['grass','ground','flying','dragon'], ['fire','water','ice','steel'], []],
  fighting: [['normal','ice','rock','dark','steel'], ['poison','flying','psychic','bug','fairy'], ['ghost']],
  poison:   [['grass','fairy'], ['poison','ground','rock','ghost'], ['steel']],
  ground:   [['fire','electric','poison','rock','steel'], ['grass','bug'], ['flying']],
  flying:   [['grass','fighting','bug'], ['electric','rock','steel'], []],
  psychic:  [['fighting','poison'], ['psychic','steel'], ['dark']],
  bug:      [['grass','psychic','dark'], ['fire','fighting','poison','flying','ghost','steel','fairy'], []],
  rock:     [['fire','ice','flying','bug'], ['fighting','ground','steel'], []],
  ghost:    [['psychic','ghost'], ['dark'], ['normal']],
  dragon:   [['dragon'], ['steel'], ['fairy']],
  dark:     [['psychic','ghost'], ['fighting','dark','fairy'], []],
  steel:    [['ice','rock','fairy'], ['fire','water','electric','steel'], []],
  fairy:    [['fighting','dragon','dark'], ['fire','poison','steel'], []],
};

const known = new Set(POKEMON_TYPES);
for (const type of POKEMON_TYPES) {
  const [strong, weak, immune] = rules[type];
  for (const target of [...strong,...weak,...immune]) {
    if (!known.has(target)) throw new Error(`Invalid type ${target} in ${type}`);
  }
  if (new Set([...strong,...weak,...immune]).size !== strong.length+weak.length+immune.length) {
    throw new Error(`Conflicting matchup for ${type}`);
  }
}

export function typeEffectiveness(moveType, defenderTypes) {
  if (!known.has(moveType)) throw new TypeError(`Unknown attacking type: ${moveType}`);
  if (!Array.isArray(defenderTypes) || defenderTypes.length < 1 || defenderTypes.length > 2 ||
      new Set(defenderTypes).size !== defenderTypes.length ||
      defenderTypes.some(type => !known.has(type))) {
    throw new TypeError('defenderTypes must contain one or two distinct Pokémon types');
  }
  const [strong, weak, immune] = rules[moveType];
  let multiplier = 1;
  for (const type of defenderTypes) {
    if (immune.includes(type)) return 0;
    if (strong.includes(type)) multiplier *= 2;
    if (weak.includes(type)) multiplier *= 0.5;
  }
  return multiplier;
}
