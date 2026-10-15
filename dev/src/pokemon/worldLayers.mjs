/**
 * Read-only view of the original approved PokéLoop tier model.
 * Do not maintain a second independently editable list of 18 types.
 */
import { TIERS } from '../pokeloop/core.js';

export const TYPE_LAYERS = Object.freeze(TIERS.map((tier, index) =>
  Object.freeze({
    level: index + 1,
    name: tier.name,
    types: Object.freeze([...tier.types]),
  })
));

export const SPACE_TRAVEL = Object.freeze({
  systemName: '우주 여행',
  buttonLabel: '우주 여행 떠나기',
  permanentCurrency: '별가루',
  permanentCurrencyCode: 'SP',
  energyResource: '타입 에너지',
});

export function layerOfType(type) {
  return TYPE_LAYERS.find(layer => layer.types.includes(type)) ?? null;
}
