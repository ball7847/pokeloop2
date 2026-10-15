/**
 * Pokémon encounters as immutable views over Rejected Draft combat templates.
 * One independent rarity roll per species per Redraw; no per-battle rerolls.
 * The encounter key is dex-specific, so several Pokémon can reuse a template.
 *
 * Provisional template allocation from pokemon.js is not final and MUST NOT
 * replace the original live catalog until the mapping is approved.
 */
import { POKEMON, rollRunRoster } from './pokemon.js';

export function buildPokemonRunEncounters({
  catalog,
  pokemon = POKEMON,
  chances,
  rng,
} = {}) {
  if (!catalog || typeof catalog !== 'object') {
    throw new TypeError('A catalog of original combat templates is required');
  }
  const selected = rollRunRoster({ pokemon, ...(chances === undefined ? {} : { chances }), ...(rng === undefined ? {} : { rng }) });
  const result = Object.create(null);
  for (const species of selected) {
    const template = catalog[species.templateId];
    if (!template) throw new Error('Missing original combat template: ' + species.templateId);
    if (result[species.id]) throw new Error('Duplicate Pokémon encounter ID: ' + species.id);
    result[species.id] = Object.freeze({
      ...template,
      id: species.id,
      name: species.name,
      pokemon: Object.freeze({
        dex: species.dex,
        name: species.name,
        types: Object.freeze([...species.types]),
        originalTemplateId: species.templateId,
      }),
    });
  }
  return Object.freeze(result);
}

/** Retrieve one already-rolled encounter; never roll on battle entry. */
export function getPokemonRunEncounter(runEncounters, dexId) {
  return Object.hasOwn(runEncounters, dexId) ? runEncounters[dexId] : null;
}
