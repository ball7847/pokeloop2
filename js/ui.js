import { CONFIG } from "./config.js";
import { getAppearanceChance, summarizePool } from "./pool.js";
import { formatReward, getPrototypeRewards } from "./progression.js";

function esc(value) {
  return String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function fmt(value, digits = 2) {
  if (Number.isInteger(value)) return String(value);
  return Number(value).toFixed(digits).replace(/0+$/, "").replace(/\.$/, "");
}

export class UI {
  constructor(app) {
    this.app = app;
    this.currentView = "battle";
    this.filters = { rarity: "전체", search: "" };
    this.bindNavigation();
  }

  bindNavigation() {
    document.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => this.showView(btn.dataset.view));
    });
  }

  showView(name) {
    this.currentView = name;
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    document.querySelector(`#view-${name}`)?.classList.add("active");
    document.querySelectorAll(".nav-button[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
    this.render();
  }

  render() {
    this.renderTopStats();
    this.renderRecentEvents();
    this.renderBattle();
    if (this.currentView === "pokemon") this.renderPokemon();
    if (this.currentView === "growth") this.renderGrowth();
    if (this.currentView === "rebirth") this.renderRebirth();
    if (this.currentView === "settings") this.renderSettings();
  }

  renderTopStats() {
    const d = this.app.state.ditto;
    const compact = [
      ["LV", d.level], ["HP", `${fmt(d.currentHp,1)}/${fmt(d.maxHp,1)}`],
      ["ATK", fmt(d.attack,2)], ["DEF", fmt(d.defense,2)], ["SPA", fmt(d.spAttack,2)],
      ["SPD", fmt(d.spDefense,2)], ["SPE", fmt(d.speed,2)], ["APS", fmt(d.attacksPerSecond,3)],
    ];
    const left = document.querySelector("#leftStats");
    if (left) left.innerHTML = compact.map(([label,value]) => `<div class="spec-card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("");

    const top = document.querySelector("#topStats");
    if (top) top.innerHTML = [
      ["환생", this.app.state.rebirthCount],
      ["런", this.app.state.run?.id || 1],
      ["풀", this.app.pool.length],
    ].map(([label,value]) => `<div class="top-resource"><div class="label">${label}</div><div class="value">${value}</div></div>`).join("");
  }

  renderRecentEvents() {
    const el = document.querySelector("#recentEvents");
    if (!el) return;
    const logs = this.app.logs.slice(-7).reverse();
    el.innerHTML = logs.length
      ? logs.map(x => `<div class="event-item ${x.type || ""}">${esc(x.text)}</div>`).join("")
      : `<div class="event-empty">아직 기록된 이벤트가 없습니다.</div>`;
  }

  renderBattle() {
    const el = document.querySelector("#view-battle");
    const p = this.app.selectedPokemon;
    const battle = this.app.battle.enemy;
    const d = this.app.state.ditto;
    const killCount = p ? (this.app.state.run.killCounts[p.id] || 0) : 0;
    const rewards = p ? getPrototypeRewards(p) : [];
    const playerPct = Math.max(0, Math.min(100, d.currentHp / d.maxHp * 100));
    const enemyPct = battle ? Math.max(0, Math.min(100, battle.currentHp / battle.maxHp * 100)) : 100;

    el.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">BATTLE</h1><p class="page-desc">이번 환생 풀에서 원하는 포켓몬을 선택해 반복 파밍한다.</p></div><div class="page-count">RUN ${this.app.state.run?.id || 1}</div></div>
      <div class="grid-2">
        <div>
          <div class="panel battle-card">
            ${p ? `
              <div class="battle-hero">
                <div class="enemy-placeholder"></div>
                <div class="enemy-info">
                  <div class="enemy-name">${esc(p.name)}</div>
                  <div class="meta-line">도감 #${String(p.dex).padStart(4,"0")} · 거리 ${p.distance} · 이번 런 처치 ${killCount}</div>
                  <span class="rarity-badge rarity-${esc(p.rarity)}">${esc(p.rarity)}</span>
                  <div class="reward-title" style="margin-top:12px">REWARDS</div>
                  <div class="reward-list">${rewards.map(r => `<span class="reward-chip">${formatReward(r)}</span>`).join("")}</div>
                </div>
              </div>
              <div class="health-block">
                <div class="health-row"><div class="health-label">ENEMY</div><div class="health-track"><div class="health-fill enemy" style="width:${enemyPct}%"></div></div><div class="health-number">${battle ? `${fmt(battle.currentHp,1)} / ${fmt(battle.maxHp,1)}` : "READY"}</div></div>
                <div class="health-row"><div class="health-label">DITTO</div><div class="health-track"><div class="health-fill player" style="width:${playerPct}%"></div></div><div class="health-number">${fmt(d.currentHp,1)} / ${fmt(d.maxHp,1)}</div></div>
              </div>
              <div class="battle-actions">
                <button id="battleStart" class="btn primary" ${this.app.battle.running ? "disabled" : ""}>Battle</button>
                <button id="battleStop" class="btn" ${this.app.battle.running ? "" : "disabled"}>Stop</button>
                <button id="choosePokemon" class="btn">Gallery</button>
              </div>
              <label class="inline-check"><input id="autoRepeat" type="checkbox" ${this.app.autoRepeat ? "checked" : ""}/> 승리 후 같은 포켓몬 자동 재전투</label>
            ` : `<div class="prototype-note">현재 선택된 포켓몬이 없습니다. 갤러리에서 이번 환생의 포켓몬을 선택하세요.</div><button id="choosePokemon" class="btn primary">Gallery</button>`}
          </div>
          <div class="panel"><div class="prototype-note">전투 수치·레벨업·성장 보상은 Core Prototype 검증용 임시 규칙입니다. 희귀도/거리/출현 구조와 분리되어 있습니다.</div></div>
        </div>
        <div class="panel">
          <h2 class="panel-title">BATTLE LOG</h2>
          <div class="battle-log">${this.app.logs.length ? this.app.logs.slice().reverse().map(x => `<div class="log-line ${x.type || ""}">${esc(x.text)}</div>`).join("") : `<div class="log-line">아직 전투 기록이 없습니다.</div>`}</div>
        </div>
      </div>`;

    el.querySelector("#battleStart")?.addEventListener("click", () => this.app.startBattle());
    el.querySelector("#battleStop")?.addEventListener("click", () => this.app.stopBattle());
    el.querySelector("#choosePokemon")?.addEventListener("click", () => this.showView("pokemon"));
    el.querySelector("#autoRepeat")?.addEventListener("change", e => this.app.autoRepeat = e.target.checked);
  }

  renderPokemon() {
    const el = document.querySelector("#view-pokemon");
    const pool = this.app.pool;
    const filtered = pool.filter(p => {
      const rarityOk = this.filters.rarity === "전체" || p.rarity === this.filters.rarity;
      const searchOk = !this.filters.search || p.name.toLowerCase().includes(this.filters.search.toLowerCase()) || String(p.dex).includes(this.filters.search);
      return rarityOk && searchOk;
    }).sort((a,b) => CONFIG.rarityOrder.indexOf(a.rarity) - CONFIG.rarityOrder.indexOf(b.rarity) || a.distance - b.distance || a.dex - b.dex);

    el.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">GALLERY</h1><p class="page-desc">이번 환생에 등장한 포켓몬. 무엇을 반복해서 잡을지가 이번 빌드를 결정한다.</p></div><div class="page-count">${filtered.length} / ${pool.length}</div></div>
      <div class="gallery-toolbar">
        <input id="pokeSearch" class="input" placeholder="이름 또는 도감번호 검색" value="${esc(this.filters.search)}" />
        <select id="rarityFilter" class="select"><option>전체</option>${CONFIG.rarityOrder.map(r => `<option ${this.filters.rarity===r?"selected":""}>${r}</option>`).join("")}</select>
      </div>
      <div class="gallery-grid">${filtered.map(p => {
        const chance = getAppearanceChance(p, this.app.state.rarityProgress);
        const selected = this.app.state.run.selectedPokemonId === p.id;
        return `<article class="pokemon-card ${selected ? "selected" : ""}">
          <div class="card-top">
            <div class="card-art">#${String(p.dex).padStart(3,"0")}</div>
            <div><div class="card-name">${esc(p.name)}</div><div class="card-dex">${esc(p.id)}</div><span class="rarity-badge rarity-${esc(p.rarity)}">${esc(p.rarity)}</span></div>
          </div>
          <div class="card-stats">
            <div class="mini-stat"><span>거리</span><strong>${p.distance}</strong></div>
            <div class="mini-stat"><span>처치</span><strong>${this.app.state.run.killCounts[p.id] || 0}</strong></div>
            <div class="mini-stat"><span>출현</span><strong>${chance == null ? "확정" : `${(chance*100).toFixed(chance*100 < 0.01 ? 3 : 1)}%`}</strong></div>
          </div>
          <div class="card-rewards"><div class="label">REWARDS</div><div class="value">${getPrototypeRewards(p).map(formatReward).join(" · ")}</div></div>
          <div class="card-action"><button class="small-btn select-pokemon" data-id="${esc(p.id)}">${selected ? "선택됨" : "Challenge"}</button></div>
        </article>`;
      }).join("")}</div>`;

    el.querySelector("#pokeSearch")?.addEventListener("input", e => { this.filters.search = e.target.value; this.renderPokemon(); });
    el.querySelector("#rarityFilter")?.addEventListener("change", e => { this.filters.rarity = e.target.value; this.renderPokemon(); });
    el.querySelectorAll(".select-pokemon").forEach(btn => btn.addEventListener("click", () => {
      this.app.selectPokemon(btn.dataset.id);
      this.showView("battle");
    }));
  }

  renderGrowth() {
    const el = document.querySelector("#view-growth");
    el.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">GROWTH</h1><p class="page-desc">희귀도별 거리 진행도는 영구 저장된다. 먼 거리 포켓몬 격파 시 즉시 점프한다.</p></div></div>
      <div class="progress-grid">${CONFIG.rarityOrder.filter(r => r !== "흔함").map(r => {
        const p = this.app.state.rarityProgress[r] || 0;
        const max = CONFIG.rarity[r].maxDistance;
        return `<div class="progress-card"><div class="progress-name rarity-${r}">${r}</div><div class="progress-value">${p} <span class="meta-line">/ ${max}</span></div><div class="progress-sub">진행도 0에서도 거리 1은 기본 출현확률</div></div>`;
      }).join("")}</div>
      <div class="panel">
        <h2 class="panel-title">Distance Decay 공식</h2>
        <div class="code-box">exponent = max(0, distance - progress - 1)\n\neffectiveChance = baseChance / decay ^ exponent\n\n예: progress 0\ndistance 1 → baseChance\ndistance 2 → baseChance / decay\ndistance 3 → baseChance / decay²</div>
      </div>`;
  }

  renderRebirth() {
    const el = document.querySelector("#view-rebirth");
    const sum = summarizePool(this.app.pool);
    el.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">REBIRTH</h1><p class="page-desc">현재 런을 비우고 새로운 포켓몬 풀을 생성한다. 거리 진행도는 유지된다.</p></div></div>
      <div class="summary-grid">${CONFIG.rarityOrder.map(r => `<div class="summary-card"><div class="big rarity-${r}">${sum[r] || 0}</div><div class="label">${r}</div></div>`).join("")}</div>
      <div class="panel">
        <h2 class="panel-title">현재 Core Prototype의 환생 처리</h2>
        <div class="prototype-note">이 초기화 범위는 최종 확정 규칙이 아니라 Core Prototype 테스트용입니다. 영구 시스템이 확정되기 전까지 거리 진행도만 영구 성장으로 취급합니다.</div>
        <div style="height:12px"></div>
        <button id="rebirthBtn" class="btn danger">환생하고 새 풀 생성</button>
      </div>`;
    el.querySelector("#rebirthBtn")?.addEventListener("click", () => this.app.rebirth());
  }

  renderSettings() {
    const el = document.querySelector("#view-settings");
    el.innerHTML = `
      <div class="page-header"><div><h1 class="page-title">SETTINGS</h1><p class="page-desc">GitHub Pages 정적 배포 기준. 브라우저 localStorage를 사용한다.</p></div></div>
      <div class="panel">
        <div class="setting-row"><div class="setting-info"><strong>포켓몬 데이터</strong><span>XLSX에서 변환된 기본 전투 대상</span></div><strong>${this.app.data.pokemon.length.toLocaleString()}종</strong></div>
        <div class="setting-row"><div class="setting-info"><strong>특별한 폼 데이터</strong><span>연결 구조만 로딩. 실제 대체 출현은 아직 비활성</span></div><strong>${this.app.data.forms.length.toLocaleString()}개</strong></div>
        <div class="setting-row"><div class="setting-info"><strong>세이브 버전</strong><span>향후 마이그레이션 기준</span></div><strong>v${CONFIG.save.version}</strong></div>
        <div class="setting-row"><div class="setting-info"><strong>수동 저장</strong><span>전투/환생 시에도 자동 저장됨</span></div><button id="manualSave" class="btn">지금 저장</button></div>
        <div class="setting-row"><div class="setting-info"><strong>세이브 내보내기</strong><span>백업용 JSON 텍스트 파일</span></div><button id="exportSave" class="btn">내보내기</button></div>
        <div class="setting-row"><div class="setting-info"><strong>세이브 가져오기</strong><span>동일 버전 JSON 세이브를 불러옴</span></div><button id="importSave" class="btn">가져오기</button></div>
        <div class="setting-row"><div class="setting-info"><strong>전체 저장 초기화</strong><span>localStorage의 현재 세이브를 완전히 삭제</span></div><button id="resetSave" class="btn danger">전체 초기화</button></div>
      </div>`;
    el.querySelector("#manualSave")?.addEventListener("click", () => this.app.manualSave());
    el.querySelector("#exportSave")?.addEventListener("click", () => this.app.downloadSave());
    el.querySelector("#importSave")?.addEventListener("click", () => this.app.pickSaveFile());
    el.querySelector("#resetSave")?.addEventListener("click", () => this.app.resetAll());
  }

  toast(message) {
    const el = document.querySelector("#toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove("show"), 1900);
  }
}
