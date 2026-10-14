/** PokéLoop encounter selection, based on original Rejected Draft Redraw rolls. */
import { TYPES } from "./core.js";
import { ORIGINAL_COMBAT_TEMPLATES } from "./templates.js";
// Initial subset only. Later: evolve replacements are an opt-in system; until then evolved species cannot spawn.
const ROWS = [
  {
    "dex": 1,
    "name": "이상해씨",
    "types": [
      "grass",
      "poison"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 4,
    "name": "파이리",
    "types": [
      "fire"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 7,
    "name": "꼬부기",
    "types": [
      "water"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 10,
    "name": "캐터피",
    "types": [
      "bug"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 16,
    "name": "구구",
    "types": [
      "normal",
      "flying"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 19,
    "name": "꼬렛",
    "types": [
      "normal"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 25,
    "name": "피카츄",
    "types": [
      "electric"
    ],
    "rarity": "rough",
    "evolved": true,
    "boss": false
  },
  {
    "dex": 35,
    "name": "삐삐",
    "types": [
      "fairy"
    ],
    "rarity": "rough",
    "evolved": true,
    "boss": false
  },
  {
    "dex": 41,
    "name": "주뱃",
    "types": [
      "poison",
      "flying"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 63,
    "name": "캐이시",
    "types": [
      "psychic"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 66,
    "name": "알통몬",
    "types": [
      "fighting"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 74,
    "name": "꼬마돌",
    "types": [
      "rock",
      "ground"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 92,
    "name": "고오스",
    "types": [
      "ghost",
      "poison"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 95,
    "name": "롱스톤",
    "types": [
      "rock",
      "ground"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 129,
    "name": "잉어킹",
    "types": [
      "water"
    ],
    "rarity": "scrap",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 131,
    "name": "라프라스",
    "types": [
      "water",
      "ice"
    ],
    "rarity": "framed",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 133,
    "name": "이브이",
    "types": [
      "normal"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 147,
    "name": "미뇽",
    "types": [
      "dragon"
    ],
    "rarity": "framed",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 212,
    "name": "핫삼",
    "types": [
      "bug",
      "steel"
    ],
    "rarity": "framed",
    "evolved": true,
    "boss": false
  },
  {
    "dex": 215,
    "name": "포푸니",
    "types": [
      "dark",
      "ice"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 280,
    "name": "랄토스",
    "types": [
      "psychic",
      "fairy"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 302,
    "name": "깜까미",
    "types": [
      "dark",
      "ghost"
    ],
    "rarity": "framed",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 304,
    "name": "가보리",
    "types": [
      "steel",
      "rock"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 443,
    "name": "딥상어동",
    "types": [
      "dragon",
      "ground"
    ],
    "rarity": "framed",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 447,
    "name": "리오르",
    "types": [
      "fighting"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 607,
    "name": "불켜미",
    "types": [
      "ghost",
      "fire"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 778,
    "name": "따라큐",
    "types": [
      "ghost",
      "fairy"
    ],
    "rarity": "framed",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 957,
    "name": "어리짱",
    "types": [
      "fairy",
      "steel"
    ],
    "rarity": "rough",
    "evolved": false,
    "boss": false
  },
  {
    "dex": 1024,
    "name": "테라파고스",
    "types": [
      "normal"
    ],
    "rarity": "boss",
    "evolved": false,
    "boss": true
  }
];
export const RARITIES=Object.freeze(["scrap","rough","framed","opus","masterpiece"]);
export const DEFAULT_RARITY_CHANCES=Object.freeze({scrap:100,rough:0,framed:0,opus:0,masterpiece:0});
const validChance=(v)=>{if(typeof v!=="number"||!Number.isFinite(v)||v<0||v>100)throw new RangeError("Chance must be 0..100");return v;};
const byRarity=Object.fromEntries(RARITIES.map(t=>[t,ORIGINAL_COMBAT_TEMPLATES.filter(p=>p.rarity===t)]));
/** Multiple Pokémon can inherit the same original combat pattern (option B).
 * This deterministic fallback allocation is provisional until balance calibration.
 */
export const POKEMON=Object.freeze(ROWS.map((p)=>{
 if(!p.types.length||p.types.length>2||p.types.some(t=>!TYPES.includes(t)))throw new Error("Invalid Pokémon typing: "+p.dex);
 const pool=byRarity[p.rarity]||[];
 const templateId=pool.length?pool[p.dex%pool.length].id:null;
 return Object.freeze({...p,id:"dex-"+p.dex,types:Object.freeze(p.types),templateId});
}));
export const FINAL_BOSSES=Object.freeze([
 {id:"terapagos",name:"테라파고스",types:["normal"],status:"planned"},
 {id:"eternatus",name:"무한다이노",types:["poison","dragon"],status:"planned"},
 {id:"ultra-necrozma",name:"울트라네크로즈마",types:["psychic","dragon"],status:"planned"},
 {id:"arceus",name:"아르세우스",types:["normal"],status:"planned"}
]);
/** Rolls each Pokémon independently ONCE at the start of a Redraw run.
 * No tier gating, forced spawns, or per-battle re-rolls.
 * Special bosses and evolved forms are excluded until their mechanics are built.
 */
export function rollRunRoster({pokemon=POKEMON,chances=DEFAULT_RARITY_CHANCES,rng=Math.random}={}){
 const chosen=[];
 for(const p of pokemon){
  if(p.evolved||p.boss||!RARITIES.includes(p.rarity))continue;
  const probability=validChance(chances[p.rarity]??0);
  if(rng()*100<probability)chosen.push(p);
 }
 return chosen;
}
/** Equivalent to original game's already-selected enemies: filter and select, not respawn. */
export function eligibleSpawns(_highestTier, options={}){
 return rollRunRoster(options);
}
export function getOriginalTemplate(pokemon){
 return ORIGINAL_COMBAT_TEMPLATES.find(t=>t.id===pokemon.templateId)||null;
}
