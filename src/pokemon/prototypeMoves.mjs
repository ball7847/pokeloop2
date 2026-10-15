import { prototypePokemon } from './prototypeRoster.mjs';
import { POKEMON_TYPES, typeEffectiveness } from './typeEffectiveness.mjs';

/**
 * Playtest-only move slots. Not a claim about each species' legal learnset,
 * generation, damage category, PP or power. Status-like move names are only
 * labels: all four entries are treated as typed hit candidates for now.
 * The original game's combat resolver is NOT modified.
 */
const prototypeMoveSlots = {
  bulbasaur: [['tackle','몸통박치기','normal'],['vine-whip','덩굴채찍','grass'],['razor-leaf','잎날가르기','grass'],['poison-powder','독가루','poison']],
  charmander: [['scratch','할퀴기','normal'],['ember','불꽃세례','fire'],['flamethrower','화염방사','fire'],['swift','스피드스타','normal']],
  squirtle: [['tackle','몸통박치기','normal'],['water-gun','물대포','water'],['bubble','거품','water'],['rapid-spin','고속스핀','normal']],
  caterpie: [['tackle','몸통박치기','normal'],['bug-bite','벌레먹음','bug'],['string-shot','실뿜기','bug'],['headbutt','박치기','normal']],
  pidgey: [['tackle','몸통박치기','normal'],['gust','바람일으키기','flying'],['quick-attack','전광석화','normal'],['wing-attack','날개치기','flying']],
  pikachu: [['quick-attack','전광석화','normal'],['thundershock','전기쇼크','electric'],['thunderbolt','10만볼트','electric'],['iron-tail','아이언테일','steel']],
  abra: [['teleport','순간이동','psychic'],['confusion','염동력','psychic'],['psybeam','환상빔','psychic'],['shadow-ball','섀도볼','ghost']],
  machop: [['low-kick','안다리걸기','fighting'],['karate-chop','태권당수','fighting'],['rock-tomb','암석봉인','rock'],['strength','괴력','normal']],
  geodude: [['tackle','몸통박치기','normal'],['rock-throw','돌떨구기','rock'],['magnitude','매그니튜드','ground'],['rollout','구르기','rock']],
  gastly: [['lick','핥기','ghost'],['night-shade','나이트헤드','ghost'],['sludge-bomb','오물폭탄','poison'],['shadow-ball','섀도볼','ghost']],
};
const knownTypes = new Set(POKEMON_TYPES);
export const prototypeMoves = Object.freeze(Object.fromEntries(
  prototypePokemon.map(pokemon => {
    const slots = prototypeMoveSlots[pokemon.slug];
    if (!slots || slots.length !== 4 || new Set(slots.map(slot => slot[0])).size !== 4) {
      throw new Error(`Expected four unique move slots: ${pokemon.slug}`);
    }
    const moves = slots.map(([id,nameKo,type],slot) => {
      if (!knownTypes.has(type)) throw new Error(`Invalid type: ${type}`);
      return Object.freeze({ id, nameKo, type, slot });
    });
    return [pokemon.slug, Object.freeze(moves)];
  })
));

export function getPrototypeMoves(pokemonSlug) {
  return prototypeMoves[pokemonSlug] ?? null;
}

export function previewMoveMatchup(pokemonSlug, moveSlot, defenderTypes) {
  const pokemon = prototypePokemon.find(p => p.slug === pokemonSlug);
  if (!pokemon) throw new TypeError('Unknown prototype Pokémon');
  if (!Number.isInteger(moveSlot) || moveSlot < 0 || moveSlot > 3) {
    throw new RangeError('Move slot must be 0–3');
  }
  const move = prototypeMoves[pokemonSlug][moveSlot];
  return Object.freeze({
    move,
    effectiveness: typeEffectiveness(move.type, defenderTypes),
    sameType: pokemon.types.includes(move.type),
  });
}
