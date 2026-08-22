import { CONFIG, absorptionLimitForLevel, explorationRangeForLevel, metaUpgradeCost } from "./config.js";
import { createDefaultState } from "./state.js";
import { generateRunPool, sortPoolForExploration } from "./pool.js";
import { BattleController } from "./battle.js";
import { processVictory, formatReward } from "./progression.js";
import { clearSave, exportSave, importSave, loadSave, saveGame } from "./save.js";
import { UI } from "./ui.js";

class GameApp {
  constructor() {
    this.data = { pokemon: [], forms: [] };
    this.pokemonById = new Map();
    this.pool = [];
    this.state = null;
    this.logs = [];
    this.events = [];
    this.autoRepeat = false;
    this.ui = null;
    this.battleCooldownUntil = 0;
    this.cooldownReason = null;
    this.cooldownTicker = null;

    this.battle = new BattleController({
      onStart: enemy => {
        this.battleLog(`${enemy.name} 전투 시작.`);
        this.render();
      },
      onLog: text => this.battleLog(text),
      onUpdate: () => this.render(),
      onFinish: (result, enemy, pokemon) => this.onBattleFinish(result, enemy, pokemon),
      onStop: () => { this.battleLog("전투를 중지했습니다."); this.render(); },
    });
  }

  async init() {
    try {
      const [pRes, fRes] = await Promise.all([
        fetch("./data/pokemon.json"),
        fetch("./data/forms.json"),
      ]);
      if (!pRes.ok || !fRes.ok) throw new Error("데이터 파일 로딩 실패");
      const pData = await pRes.json();
      const fData = await fRes.json();
      this.data.pokemon = pData.pokemon;
      this.data.forms = fData.forms;
      this.pokemonById = new Map(this.data.pokemon.map(p => [p.id, p]));

      this.state = loadSave() || createDefaultState();
      this.ui = new UI(this);

      if (!this.state.run.poolIds?.length) this.createNewRun(false);
      else this.restorePoolFromSave();

      this.logs = Array.isArray(this.state.run.battleLog) ? [...this.state.run.battleLog].slice(-120) : [];
      this.events = Array.isArray(this.state.run.recentEvents) ? [...this.state.run.recentEvents].slice(-40) : [];
      this.autoRepeat = false;

      if (!this.state.run.selectedPokemonId || !this.pokemonById.has(this.state.run.selectedPokemonId) || !this.isPokemonRevealed(this.state.run.selectedPokemonId)) {
        this.state.run.selectedPokemonId = this.revealedPool[0]?.id || null;
      }

      this.render();
      setInterval(() => saveGame(this.state), CONFIG.save.autosaveMs);
      window.addEventListener("beforeunload", () => saveGame(this.state));
    } catch (error) {
      console.error(error);
      document.body.innerHTML = `<div style="padding:24px;font-family:sans-serif;color:white;background:#111;min-height:100vh"><h1>게임 데이터 로딩 실패</h1><p>GitHub Pages 또는 로컬 웹서버에서 실행해야 합니다. index.html을 file://로 직접 열면 JSON fetch가 차단될 수 있습니다.</p><pre>${String(error)}</pre></div>`;
    }
  }

  get battleCooldownRemainingMs() { return Math.max(0, this.battleCooldownUntil - Date.now()); }
  get battleCooldownRemainingSeconds() { return this.battleCooldownRemainingMs / 1000; }

  startBattleCooldown(seconds, reason, recoverHpAtEnd = false) {
    const durationMs = Math.max(0, seconds * 1000);
    this.battleCooldownUntil = Date.now() + durationMs;
    this.cooldownReason = reason;

    clearInterval(this.cooldownTicker);
    if (durationMs <= 0) {
      if (recoverHpAtEnd) this.state.ditto.currentHp = this.state.ditto.maxHp;
      this.battleCooldownUntil = 0;
      this.cooldownReason = null;
      this.render();
      return;
    }

    this.cooldownTicker = setInterval(() => {
      if (this.battleCooldownRemainingMs <= 0) {
        clearInterval(this.cooldownTicker);
        this.cooldownTicker = null;
        if (recoverHpAtEnd) this.state.ditto.currentHp = this.state.ditto.maxHp;
        this.battleCooldownUntil = 0;
        this.cooldownReason = null;
        saveGame(this.state);
      }
      this.render();
    }, 100);
  }

  get selectedPokemon() {
    return this.state?.run?.selectedPokemonId ? this.pokemonById.get(this.state.run.selectedPokemonId) : null;
  }
  get explorationRange() { return explorationRangeForLevel(this.state?.upgrades?.explorationLevel || 0); }
  get absorptionLimit() { return absorptionLimitForLevel(this.state?.upgrades?.absorptionLevel || 0); }
  get autoRepeatUnlocked() { return Boolean(this.state?.upgrades?.autoRepeatUnlocked); }

  get revealedPool() {
    const stored = Math.max(0, this.state?.run?.revealedCount || 0);
    const visibleCount = Math.min(this.pool.length, Math.max(this.explorationRange, stored));
    return this.pool.slice(0, visibleCount);
  }

  isPokemonRevealed(id) { return this.revealedPool.some(p => p.id === id); }

  restorePoolFromSave() {
    this.pool = sortPoolForExploration((this.state.run.poolIds || []).map(id => this.pokemonById.get(id)).filter(Boolean));
    this.state.run.poolIds = this.pool.map(p => p.id);
    if (this.pool.length < 50) {
      this.createNewRun(false);
      return;
    }
    if (!this.state.run.revealedCount) {
      const defeatedOnce = this.pool.reduce((n, p) => n + ((this.state.run.killCounts[p.id] || 0) >= 1 ? 1 : 0), 0);
      this.state.run.revealedCount = Math.min(this.pool.length, this.explorationRange + defeatedOnce);
    } else {
      this.state.run.revealedCount = Math.max(this.state.run.revealedCount, this.explorationRange);
    }
  }

  createNewRun(countAsRebirth = true) {
    this.battle.stop(false);
    clearInterval(this.cooldownTicker);
    this.cooldownTicker = null;
    this.battleCooldownUntil = 0;
    this.cooldownReason = null;
    this.autoRepeat = false;
    if (countAsRebirth) this.state.rebirthCount += 1;

    this.pool = generateRunPool(this.data.pokemon, this.state.rarityProgress);
    this.state.run = {
      id: (this.state.run?.id || 0) + 1,
      startedAt: Date.now(),
      poolIds: this.pool.map(p => p.id),
      killCounts: {},
      revealedCount: Math.min(this.pool.length, this.explorationRange),
      selectedPokemonId: this.pool[0]?.id || null,
      battleLog: [],
      recentEvents: [],
    };

    this.state.ditto = createDefaultState().ditto;
    this.logs = [];
    this.events = [];
    this.event(`새 런이 시작되었습니다. 초기 탐색 대상 ${this.revealedPool.length}종이 확인되었습니다.`, "progress");
    saveGame(this.state);
  }

  selectPokemon(id) {
    if (!this.state.run.poolIds.includes(id) || !this.isPokemonRevealed(id)) return;
    this.battle.stop(false);
    this.state.run.selectedPokemonId = id;
    saveGame(this.state);
    this.ui.toast(`${this.pokemonById.get(id)?.name || "포켓몬"} 선택`);
  }

  startBattle() {
    const pokemon = this.selectedPokemon;
    if (!pokemon || this.battle.running) return;
    if (this.battleCooldownRemainingMs > 0) {
      const label = this.cooldownReason === "defeat" ? "패배 회복" : "도주 페널티";
      this.ui?.toast(`${label} 중 · ${this.battleCooldownRemainingSeconds.toFixed(1)}초`);
      return;
    }
    this.battle.start(this.state, pokemon);
  }

  stopBattle() {
    if (!this.battle.running) return;
    this.battle.stop(false);
    this.state.ditto.currentHp = this.state.ditto.maxHp;
    this.startBattleCooldown(CONFIG.battle.fleeRecoverySeconds, "flee", false);
    this.battleLog(`전투에서 도주. ${CONFIG.battle.fleeRecoverySeconds}초 동안 재도전할 수 없습니다.`, "bad");
    this.event(`${this.selectedPokemon?.name || "포켓몬"}과의 전투에서 무사히 도망쳤습니다.`, "bad");
    saveGame(this.state);
    this.render();
  }

  revealNextPokemon() {
    const before = Math.max(this.explorationRange, this.state.run.revealedCount || 0);
    if (before >= this.pool.length) return null;
    this.state.run.revealedCount = Math.min(this.pool.length, before + 1);
    return this.pool[this.state.run.revealedCount - 1] || null;
  }

  onBattleFinish(result, enemy, pokemon) {
    if (result === "victory") {
      const resultData = processVictory(this.state, pokemon, this.absorptionLimit);
      this.state.ditto.currentHp = this.state.ditto.maxHp;
      const multiplierText = `${(resultData.rewardMultiplier * 100).toFixed(resultData.rewardMultiplier < 0.1 ? 1 : 0)}%`;
      const rewardText = resultData.rewards.length ? resultData.rewards.map(formatReward).join(", ") : "능력치 보상 없음";
      const researchText = resultData.research > 0 ? ` · 연구 포인트 +${resultData.research.toFixed(2)}` : "";
      this.battleLog(`${pokemon.name} 격파. 보상 배율 ${multiplierText} · ${rewardText}`, "good");
      this.battleLog(`경험치 +${resultData.exp.gained}${researchText}`, "good");
      this.event(`${pokemon.name}을(를) 쓰러뜨렸습니다. (${this.state.run.killCounts[pokemon.id]}/${this.absorptionLimit})`, "good");

      if (resultData.firstVictory) {
        const newlyRevealed = this.revealNextPokemon();
        if (newlyRevealed) {
          this.event(`탐색이 진행되어 ${newlyRevealed.name}이(가) 새롭게 나타났습니다.`, "progress");
        }
      }
      if (resultData.newlyAbsorbed) {
        this.event(`${pokemon.name}의 흡수 한계 ${this.absorptionLimit}회를 채웠습니다. 이후에는 경험치만 획득합니다.`, "progress");
      }
      if (resultData.exp.levelUps.length) {
        this.battleLog(`레벨 업 → Lv.${resultData.exp.levelUps.at(-1)}`, "progress");
        this.event(`메타몽이 Lv.${resultData.exp.levelUps.at(-1)}에 도달했습니다.`, "progress");
      }
      if (resultData.progressChange) {
        const p = resultData.progressChange;
        this.battleLog(`${p.rarity} 거리 진행도 ${p.from} → ${p.to}`, "progress");
        this.event(`${p.rarity} 탐색 진행도가 거리 ${p.to}까지 상승했습니다.`, "progress");
      }

      saveGame(this.state);
      this.render();
      if (this.autoRepeatUnlocked && this.autoRepeat && this.state.run.selectedPokemonId === pokemon.id) {
        this.battle.scheduleRepeat(() => this.startBattle());
      }
    } else {
      this.battleLog(`${pokemon.name}에게 패배. ${CONFIG.battle.deathRecoverySeconds}초 후 HP가 완전히 회복됩니다.`, "bad");
      this.event(`메타몽이 ${pokemon.name}과의 전투에서 쓰러졌습니다.`, "bad");
      this.startBattleCooldown(CONFIG.battle.deathRecoverySeconds, "defeat", true);
      saveGame(this.state);
      this.render();
    }
  }

  buyMetaUpgrade(type) {
    const key = type === "exploration" ? "explorationLevel" : "absorptionLevel";
    const level = this.state.upgrades[key] || 0;
    const cost = metaUpgradeCost(type, level);
    if (this.state.resources.researchPoints + 1e-9 < cost) {
      this.ui?.toast(`연구 포인트가 부족합니다. 필요: ${cost}`);
      return;
    }
    this.state.resources.researchPoints -= cost;
    this.state.upgrades[key] = level + 1;
    if (type === "exploration") this.state.run.revealedCount = Math.max(this.state.run.revealedCount || 0, this.explorationRange);
    const label = type === "exploration" ? `탐색 범위 ${this.explorationRange}` : `흡수 한계 ${this.absorptionLimit}`;
    this.event(`${label}로 증가했습니다.`, "progress");
    saveGame(this.state);
    this.render();
    this.ui?.toast(label);
  }

  unlockAutoRepeat() {
    if (this.autoRepeatUnlocked) return;
    const cost = CONFIG.metaProgression.autoRepeatUnlockCost;
    if (this.state.resources.researchPoints + 1e-9 < cost) {
      this.ui?.toast(`연구 포인트가 부족합니다. 필요: ${cost}`);
      return;
    }
    this.state.resources.researchPoints -= cost;
    this.state.upgrades.autoRepeatUnlocked = true;
    this.autoRepeat = false;
    this.event("자동 재도전 기능을 해금했습니다.", "progress");
    saveGame(this.state);
    this.render();
    this.ui?.toast("자동 재도전 해금");
  }

  rebirth() {
    if (!confirm("현재 런의 메타몽 성장과 이번 런 처치 수를 초기화하고 새 포켓몬 풀을 생성할까요?\n거리 진행도·연구 포인트·연구 업그레이드는 유지됩니다.")) return;
    this.createNewRun(true);
    this.ui.toast("새 환생 풀이 생성되었습니다.");
    this.ui.showView("battle");
  }

  resetAll() {
    if (!confirm("전체 저장을 삭제합니다. 이 작업은 되돌릴 수 없습니다. 계속할까요?")) return;
    if (!confirm("정말 초기화할까요? 희귀도별 거리 진행도도 모두 삭제됩니다.")) return;
    this.battle.stop(false);
    clearSave();
    this.state = createDefaultState();
    this.createNewRun(false);
    this.ui.toast("전체 저장을 초기화했습니다.");
    this.ui.showView("battle");
  }

  manualSave() { saveGame(this.state); this.ui.toast("저장했습니다."); }

  downloadSave() {
    const blob = new Blob([exportSave(this.state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metamon-save-v${CONFIG.save.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  pickSaveFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const next = importSave(await file.text());
        this.battle.stop(false);
        this.state = next;
        this.restorePoolFromSave();
        this.logs = Array.isArray(this.state.run.battleLog) ? [...this.state.run.battleLog] : [];
        this.events = Array.isArray(this.state.run.recentEvents) ? [...this.state.run.recentEvents] : [];
        this.autoRepeat = false;
        saveGame(this.state);
        this.ui.toast("세이브를 불러왔습니다.");
        this.render();
      } catch (error) {
        alert(`세이브를 불러오지 못했습니다.\n${error.message}`);
      }
    });
    input.click();
  }

  battleLog(text, type = "") {
    const entry = { text, type, at: Date.now() };
    this.logs.push(entry);
    if (this.logs.length > 120) this.logs.shift();
    if (this.state?.run) this.state.run.battleLog = [...this.logs];
  }

  event(text, type = "") {
    const entry = { text, type, at: Date.now() };
    this.events.push(entry);
    if (this.events.length > 40) this.events.shift();
    if (this.state?.run) this.state.run.recentEvents = [...this.events];
  }

  render() { this.ui?.render(); }
}

const app = new GameApp();
app.init();
