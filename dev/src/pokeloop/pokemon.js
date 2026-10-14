/** First playable roster; separate species/forms can be added without touching combat code. */
import { TYPES } from "./core.js";
const data = [
 [1,"이상해씨",["grass","poison"],"common"],
 [4,"파이리",["fire"],"common"],
 [7,"꼬부기",["water"],"common"],
 [10,"캐터피",["bug"],"common"],
 [16,"구구",["normal","flying"],"common"],
 [19,"꼬렛",["normal"],"common"],
 [25,"피카츄",["electric"],"uncommon"],
 [35,"삐삐",["fairy"],"uncommon"],
 [41,"주뱃",["poison","flying"],"common"],
 [63,"캐이시",["psychic"],"uncommon"],
 [66,"알통몬",["fighting"],"common"],
 [74,"꼬마돌",["rock","ground"],"common"],
 [92,"고오스",["ghost","poison"],"uncommon"],
 [95,"롱스톤",["rock","ground"],"uncommon"],
 [129,"잉어킹",["water"],"common"],
 [131,"라프라스",["water","ice"],"rare"],
 [133,"이브이",["normal"],"uncommon"],
 [147,"미뇽",["dragon"],"rare"],
 [212,"핫삼",["bug","steel"],"rare"],
 [215,"포푸니",["dark","ice"],"uncommon"],
 [280,"랄토스",["psychic","fairy"],"uncommon"],
 [302,"깜까미",["dark","ghost"],"rare"],
 [304,"가보리",["steel","rock"],"uncommon"],
 [443,"딥상어동",["dragon","ground"],"rare"],
 [447,"리오르",["fighting"],"uncommon"],
 [607,"불켜미",["ghost","fire"],"uncommon"],
 [778,"따라큐",["ghost","fairy"],"rare"],
 [957,"어리짱",["fairy","steel"],"uncommon"],
 [1024,"테라파고스",["normal"],"boss"]
];
export const POKEMON=Object.freeze(data.map(([dex,name,types,rarity])=>{
 if(!types.every(t=>TYPES.includes(t)))throw new Error("Bad Pokémon typing");
 return Object.freeze({dex,name,types:Object.freeze(types),rarity,id:"dex-"+dex});
}));
export const FINAL_BOSSES=Object.freeze([
 {id:"terapagos",name:"테라파고스",types:["normal"],status:"planned"},
 {id:"eternatus",name:"무한다이노",types:["poison","dragon"],status:"planned"},
 {id:"ultra-necrozma",name:"울트라네크로즈마",types:["psychic","dragon"],status:"planned"},
 {id:"arceus",name:"아르세우스",types:["normal"],status:"planned"}
]);
export function pickSpawn(eligible,{rng=Math.random,rarityWeights={common:75,uncommon:20,rare:5}}={}){
 if(!eligible.length)return null;
 const candidates=eligible.map(p=>({p,weight:rarityWeights[p.rarity]??0})).filter(e=>e.weight>0);
 const total=candidates.reduce((s,e)=>s+e.weight,0);
 if(total===0)return null;
 let remaining=rng()*total;
 for(const entry of candidates){remaining-=entry.weight;if(remaining<0)return entry.p;}
 return candidates[candidates.length-1].p;
}
/** Soft spawn limiting: high-tier typings can appear early at low probability. */
export function eligibleSpawns(highestTier,{earlyRareChance=0.02,rng=Math.random}={}){
 return POKEMON.filter(p=>{
  if(p.rarity==="boss")return false;
  const required=Math.max(...p.types.map(t=>typeTier(t)));
  return required<=highestTier+1 || rng()<earlyRareChance;
 });
}
const typeTier=type=>({
 normal:1,fire:2,water:2,grass:2,electric:3,bug:4,flying:4,
 ground:5,rock:5,fighting:6,psychic:6,dark:6,steel:7,poison:7,
 ice:8,ghost:8,dragon:9,fairy:10
})[type];
