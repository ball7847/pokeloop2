/**
 * PokéLoop 2 — isolated, testable Pokémon economy / type rules.
 * No original bundle has been replaced. Import this from the eventual game-store adapter.
 */
export const TYPES = Object.freeze([
  "normal","fire","water","grass","electric","bug","flying","ground",
  "rock","fighting","psychic","dark","steel","poison","ice","ghost","dragon","fairy"
]);
export const TYPE_LABELS = Object.freeze({
  normal:"노말", fire:"불꽃", water:"물", grass:"풀", electric:"전기",
  bug:"벌레", flying:"비행", ground:"땅", rock:"바위",
  fighting:"격투", psychic:"에스퍼", dark:"악", steel:"강철",
  poison:"독", ice:"얼음", ghost:"고스트", dragon:"드래곤", fairy:"페어리"
});
export const TIERS = Object.freeze([
  {name:"세계",types:["normal"]},
  {name:"탄생",types:["fire","water","grass"]},
  {name:"에너지",types:["electric"]},
  {name:"생태계",types:["bug","flying"]},
  {name:"대지",types:["ground","rock"]},
  {name:"전쟁",types:["fighting","psychic","dark"]},
  {name:"진보",types:["steel","poison"]},
  {name:"죽음",types:["ice","ghost"]},
  {name:"불멸",types:["dragon"]},
  {name:"초월",types:["fairy"]}
]);
export const FIRST_MILESTONE = 1025;
export const DEFAULT_ASSIMILATION = Object.freeze(Object.fromEntries(TYPES.map(t=>[t,t==="normal"?100:0])));
// Conventional Pokémon attacking matchups. Immunities are assigned 0.25x, never zero.
const SUPER = {
 normal:[],fire:["grass","ice","bug","steel"],water:["fire","ground","rock"],
 grass:["water","ground","rock"],electric:["water","flying"],
 ice:["grass","ground","flying","dragon"],fighting:["normal","ice","rock","dark","steel"],
 poison:["grass","fairy"],ground:["fire","electric","poison","rock","steel"],
 flying:["grass","fighting","bug"],psychic:["fighting","poison"],
 bug:["grass","psychic","dark"],rock:["fire","ice","flying","bug"],
 ghost:["psychic","ghost"],dragon:["dragon"],dark:["psychic","ghost"],
 steel:["ice","rock","fairy"],fairy:["fighting","dragon","dark"]
};
const RESIST = {
 normal:[],fire:["fire","grass","ice","bug","steel","fairy"],
 water:["fire","water","ice","steel"],grass:["water","electric","grass","ground"],
 electric:["electric","flying","steel"],bug:["grass","fighting","ground"],
 flying:["grass","fighting","bug"],ground:["poison","rock"],
 rock:["normal","fire","poison","flying"],fighting:["bug","rock","dark"],
 psychic:["fighting","psychic"],dark:["ghost","dark"],
 steel:["normal","grass","ice","flying","psychic","bug","rock","dragon","steel","fairy"],
 poison:["grass","fighting","poison","bug","fairy"],ice:["ice"],
 ghost:["poison","bug"],dragon:["fire","water","electric","grass"],
 fairy:["fighting","bug","dark"]
};
const IMMUNE = {
 normal:["ghost"],ground:["electric"],flying:["ground"],ghost:["normal","fighting"],
 steel:["poison"],dark:["psychic"],fairy:["dragon"]
};
const NOT_EFFECTIVE = {
 normal:["rock","steel"],fire:["fire","water","rock","dragon"],
 water:["water","grass","dragon"],electric:["electric","grass","dragon"],
 grass:["fire","grass","poison","flying","bug","dragon","steel"],
 ice:["fire","water","ice","steel"],fighting:["poison","flying","psychic","bug","fairy"],
 poison:["poison","ground","rock","ghost"],ground:["grass","bug"],
 flying:["electric","rock","steel"],psychic:["psychic","steel"],
 bug:["fire","fighting","poison","flying","ghost","steel","fairy"],
 rock:["fighting","ground","steel"],ghost:["dark"],dragon:["steel"],
 dark:["fighting","dark","fairy"],steel:["fire","water","electric","steel"],
 fairy:["fire","poison","steel"]
};
const known = type => { if(!TYPES.includes(type)) throw new Error("Unknown type: "+type); return type; };
const numeric = n => { const x=Number(n); if(!Number.isFinite(x)||x<0)throw new RangeError("Expected non-negative finite value"); return x; };
export function tierForType(type){ known(type); return TIERS.findIndex(t=>t.types.includes(type))+1; }
export function baseEffectiveness(attackType,defendingTypes) {
 known(attackType);
 return defendingTypes.reduce((m,t)=>{
  known(t);
  const factor=(IMMUNE[t]||[]).includes(attackType)?.25:
   SUPER[attackType].includes(t)?2:
   (NOT_EFFECTIVE[attackType]||[]).includes(t)?.5:1;
  return m*factor;
 },1);
}
export function assimilationMultiplier(assimilation, targetTypes, mode="attack"){
 if(mode!=="attack"&&mode!=="defense")throw new Error("Unknown mode");
 return Object.entries(assimilation).reduce((factor,[type,percent])=>{
  known(type); const amount=numeric(percent)/100;
  if(amount===0)return factor;
  const matches=mode==="attack"?SUPER[type]:[...RESIST[type],...(IMMUNE[type]||[])];
  return targetTypes.reduce((value,other)=>{
   known(other);
   return matches.includes(other)? value*(mode==="attack"?1+amount:1/(1+amount)):value;
  },factor);
 },1);
}
export function freshRun(){
 return {
  energy:Object.fromEntries(TYPES.map(t=>[t,0])),
  reserved:Object.fromEntries(TYPES.map(t=>[t,0])),
  earned:Object.fromEntries(TYPES.map(t=>[t,0])),
  milestones:Object.fromEntries(TYPES.map(t=>[t,0])),
  unlockedTiers:[1],
  assimilation:{...DEFAULT_ASSIMILATION},
  encounteredTypes:[],
  stellarEnergy:0
 };
}
export function advanceUnlocks(state,threshold=FIRST_MILESTONE) {
 numeric(threshold);
 let changed=true;
 while(changed){
  changed=false;
  const highest=Math.max(...state.unlockedTiers);
  if(highest>=10)break;
  const prior=TIERS[highest-1];
  if(prior.types.some(t=>state.earned[t]>=threshold)){
   const next=highest+1;
   state.unlockedTiers.push(next);
   for(const t of TIERS[next-1].types) {
    const amount=state.reserved[t]||0;
    state.reserved[t]=0;
    state.energy[t]+=amount;
    state.earned[t]+=amount;
   }
   changed=true;
  }
 }
 for(const t of TYPES)state.milestones[t]=Math.max(state.milestones[t]||0,state.earned[t]>=threshold?1:0);
 return state;
}
export function grantEnergy(state,type,amount) {
 known(type); numeric(amount);
 if(state.unlockedTiers.includes(tierForType(type))){
  state.energy[type]+=amount;
  state.earned[type]+=amount;
 }else {
  state.reserved[type]+=amount/2; // other half discarded
 }
 return advanceUnlocks(state);
}
export function grantBattleRewards(state,pokemonTypes,totalReward) {
 if(!Array.isArray(pokemonTypes)||pokemonTypes.length<1||pokemonTypes.length>2||
    new Set(pokemonTypes).size!==pokemonTypes.length)throw new Error("Expected one or two distinct types");
 numeric(totalReward);pokemonTypes.forEach(known);
 const share=totalReward/pokemonTypes.length;
 // Split the whole reward before processing any tier-unlock side effects.
 const unlockedAtStart=new Set(state.unlockedTiers);
 for(const type of pokemonTypes){
  if(unlockedAtStart.has(tierForType(type))){state.energy[type]+=share;state.earned[type]+=share;}
  else state.reserved[type]+=share/2;
 }
 return advanceUnlocks(state);
}
export function totalConvertedReward(originalRewards, weights){
 if(!Array.isArray(originalRewards)||originalRewards.length!==10||
   !Array.isArray(weights)||weights.length!==10)throw new Error("10 rewards and 10 weights required");
 return originalRewards.reduce((total,reward,i)=>total+numeric(reward)*numeric(weights[i]),0);
}
export function splitGeneratorOutput(state,tier,amount){
 if(!Number.isInteger(tier)||tier<1||tier>10)throw new Error("Tier out of range");
 numeric(amount);
 if(!state.unlockedTiers.includes(tier))return state;
 const each=amount/TIERS[tier-1].types.length;
 for(const type of TIERS[tier-1].types){state.energy[type]+=each;state.earned[type]+=each;}
 return advanceUnlocks(state);
}
export function tierConceptProduction(typeOutputs,tier){
 const members=TIERS[tier-1]?.types;
 if(!members)throw new Error("Invalid tier");
 return members.reduce((sum,t)=>sum+numeric(typeOutputs[t]||0),0)/members.length;
}
export function recordEncounter(state,pokemonTypes){
 for(const type of pokemonTypes){known(type);state.encounteredTypes.push(type);}
 return state;
}
export function redraw(state,{stellarPayout=0,assimilationPerEncounter=0}={}){
 numeric(stellarPayout);numeric(assimilationPerEncounter);
 const next=freshRun();
 next.stellarEnergy=state.stellarEnergy+stellarPayout;
 next.assimilation={...state.assimilation};
 for(const type of state.encounteredTypes)next.assimilation[type]+=assimilationPerEncounter;
 next.milestones.normal=state.milestones.normal;
 next.earned.normal=state.earned.normal; // preserve normal milestones without retaining spendable balance
 advanceUnlocks(next);
 return next;
}
export function discountedPrice(base,discountFactor){numeric(base);numeric(discountFactor);return base*discountFactor;}
export function canAfford(state,type,cost){known(type);numeric(cost);return state.energy[type]>=cost;}
export function purchase(state,type,cost){if(!canAfford(state,type,cost))return false;state.energy[type]-=cost;return true;}
