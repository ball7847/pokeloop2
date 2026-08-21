import { CONFIG } from "./config.js";

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export function createEnemy(pokemon) {
  const rarity = CONFIG.rarity[pokemon.rarity];
  const scale = rarity?.combatScale || 1;
  const d = Math.max(1, pokemon.distance);
  const pattern = numericHash(pokemon.id);
  const physicalLean = (pattern % 2) === 0;

  const maxHp = Math.round(CONFIG.battle.enemyBaseHp * scale * (1 + (d - 1) * CONFIG.battle.distanceHpGrowth));
  const offense = CONFIG.battle.enemyBaseOffense * scale * (1 + (d - 1) * CONFIG.battle.distanceOffenseGrowth);
  const defense = CONFIG.battle.enemyBaseDefense * scale * (1 + (d - 1) * CONFIG.battle.distanceDefenseGrowth);
  const speed = CONFIG.battle.enemyBaseSpeed * Math.sqrt(scale) * (1 + (d - 1) * CONFIG.battle.distanceSpeedGrowth);

  return {
    pokemonId: pokemon.id,
    name: pokemon.name,
    rarity: pokemon.rarity,
    distance: pokemon.distance,
    maxHp,
    currentHp: maxHp,
    offense,
    defense,
    speed,
    attackType: physicalLean ? "physical" : "special",
  };
}

function numericHash(text) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = Math.imul(31, h) + text.charCodeAt(i) | 0;
  return Math.abs(h);
}

export function attackIntervalMs(speed, attacksPerSecond = null) {
  if (attacksPerSecond != null) {
    return Math.max(CONFIG.battle.minIntervalMs, 1000 / Math.max(0.05, attacksPerSecond));
  }
  return Math.max(CONFIG.battle.minIntervalMs, CONFIG.battle.baseIntervalMs / Math.max(0.25, speed / 10));
}

export function playerDamage(ditto, enemy) {
  const useSpecial = ditto.spAttack > ditto.attack;
  const offense = useSpecial ? ditto.spAttack : ditto.attack;
  const raw = offense - enemy.defense * CONFIG.battle.enemyDefenseFactor;
  return {
    amount: Math.max(1, Number(raw.toFixed(2))),
    mode: useSpecial ? "특공" : "공격",
  };
}

export function enemyDamage(enemy, ditto) {
  const defense = enemy.attackType === "physical" ? ditto.defense : ditto.spDefense;
  const raw = enemy.offense - defense * CONFIG.battle.playerDefenseFactor;
  return Math.max(1, Number(raw.toFixed(2)));
}

export class BattleController {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.playerTimer = null;
    this.enemyTimer = null;
    this.repeatTimer = null;
    this.running = false;
    this.enemy = null;
    this.pokemon = null;
    this.state = null;
  }

  start(state, pokemon) {
    this.stop(false);
    this.state = state;
    this.pokemon = pokemon;
    this.enemy = createEnemy(pokemon);

    if (CONFIG.battle.fullHealBeforeBattle) state.ditto.currentHp = state.ditto.maxHp;
    this.running = true;
    this.callbacks.onStart?.(this.enemy);
    this.callbacks.onUpdate?.(this.enemy);

    const playerEvery = attackIntervalMs(state.ditto.speed, state.ditto.attacksPerSecond);
    const enemyEvery = attackIntervalMs(this.enemy.speed);

    this.playerTimer = setInterval(() => this.playerAttack(), playerEvery);
    this.enemyTimer = setInterval(() => this.enemyAttack(), enemyEvery);
  }

  playerAttack() {
    if (!this.running) return;
    const hit = playerDamage(this.state.ditto, this.enemy);
    this.enemy.currentHp = clamp(this.enemy.currentHp - hit.amount, 0, this.enemy.maxHp);
    this.callbacks.onLog?.(`메타몽이 ${hit.mode} 기반으로 ${hit.amount.toFixed(2)} 피해.`);
    this.callbacks.onUpdate?.(this.enemy);
    if (this.enemy.currentHp <= 0) this.finish("victory");
  }

  enemyAttack() {
    if (!this.running) return;
    const damage = enemyDamage(this.enemy, this.state.ditto);
    this.state.ditto.currentHp = clamp(this.state.ditto.currentHp - damage, 0, this.state.ditto.maxHp);
    this.callbacks.onLog?.(`${this.enemy.name}이 ${damage.toFixed(2)} 피해.`);
    this.callbacks.onUpdate?.(this.enemy);
    if (this.state.ditto.currentHp <= 0) this.finish("defeat");
  }

  finish(result) {
    if (!this.running) return;
    this.running = false;
    clearInterval(this.playerTimer);
    clearInterval(this.enemyTimer);
    this.playerTimer = null;
    this.enemyTimer = null;
    this.callbacks.onFinish?.(result, this.enemy, this.pokemon);
  }

  scheduleRepeat(callback) {
    clearTimeout(this.repeatTimer);
    this.repeatTimer = setTimeout(callback, CONFIG.battle.repeatDelayMs);
  }

  stop(notify = true) {
    clearInterval(this.playerTimer);
    clearInterval(this.enemyTimer);
    clearTimeout(this.repeatTimer);
    this.playerTimer = null;
    this.enemyTimer = null;
    this.repeatTimer = null;
    const wasRunning = this.running;
    this.running = false;
    if (notify && wasRunning) this.callbacks.onStop?.();
  }
}
