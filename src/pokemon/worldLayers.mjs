/**
 * Agreed PokéLoop 2 cosmology. Data only; does not replace Rejected Draft
 * redraw/prestige until the Star Dust progression rules are implemented.
 * Type energy and Star Dust are separate resources.
 */
export const TYPE_LAYERS = Object.freeze([
  { level: 1, name: '세계', types: ['normal'] },
  { level: 2, name: '탄생', types: ['fire','water','grass'] },
  { level: 3, name: '에너지', types: ['electric'] },
  { level: 4, name: '생태계', types: ['bug','flying'] },
  { level: 5, name: '대지', types: ['ground','rock'] },
  { level: 6, name: '전쟁', types: ['fighting','psychic','dark'] },
  { level: 7, name: '진보', types: ['steel','poison'] },
  { level: 8, name: '죽음', types: ['ice','ghost'] },
  { level: 9, name: '불멸', types: ['dragon'] },
  { level: 10, name: '초월', types: ['fairy'] },
].map(layer => Object.freeze({ ...layer, types: Object.freeze(layer.types) })));

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
