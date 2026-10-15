/**
 * PokéLoop 2 first vertical-slice roster.
 *
 * TEMPORARY 1:1 encounter-template mapping for the first 10 Pokémon.
 * Template IDs refer to the original Rejected Draft catalog. Combat stats,
 * rewards and appearance weights remain owned by the ORIGINAL template;
 * do not silently replace them with Pokémon base stats.
 *
 * Names/types are canonical; the particular template pairing is a playtest
 * placeholder, not the final user-approved 1:N allocation.
 * Evolved forms are intentionally excluded.
 */
export const prototypePokemon = Object.freeze([
  { id: 1, slug: 'bulbasaur', nameKo: '이상해씨', types: ['grass', 'poison'], templateId: 'stick man' },
  { id: 4, slug: 'charmander', nameKo: '파이리', types: ['fire'], templateId: 'fountain_pen_duelist' },
  { id: 7, slug: 'squirtle', nameKo: '꼬부기', types: ['water'], templateId: 'sub_xero' },
  { id: 10, slug: 'caterpie', nameKo: '캐터피', types: ['bug'], templateId: 'smudge' },
  { id: 16, slug: 'pidgey', nameKo: '구구', types: ['normal', 'flying'], templateId: 'clockwork_heart' },
  { id: 25, slug: 'pikachu', nameKo: '피카츄', types: ['electric'], templateId: 'perspective_block' },
  { id: 63, slug: 'abra', nameKo: '캐이시', types: ['psychic'], templateId: 'wash_ink_ton' },
  { id: 66, slug: 'machop', nameKo: '알통몬', types: ['fighting'], templateId: 'dumb_door' },
  { id: 74, slug: 'geodude', nameKo: '꼬마돌', types: ['rock', 'ground'], templateId: 'v-wing_bat' },
  { id: 92, slug: 'gastly', nameKo: '고오스', types: ['ghost', 'poison'], templateId: 'rorschach_bat' },
].map(species => Object.freeze({ ...species, types: Object.freeze(species.types) })));

export const prototypeByTemplate = new Map(
  prototypePokemon.map(species => [species.templateId, species]),
);

export function getPrototypePokemon(templateId) {
  return prototypeByTemplate.get(templateId) ?? null;
}

export function overlayPrototypePokemon(template, pokemon = getPrototypePokemon(template?.id)) {
  if (!pokemon) return template;
  // Presentation-only overlay: retain source stats, rarity, reward entries,
  // spawn logic and ID to avoid changes to baseline gameplay balance.
  return {
    ...template,
    name: pokemon.nameKo,
    pokemon: { id: pokemon.id, slug: pokemon.slug, types: [...pokemon.types] },
  };
}
