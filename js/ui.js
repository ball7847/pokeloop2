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
    this.renderBattle();
    if (this.currentView === "pokemon") this.renderPokemon();
    if (this.currentView === "growth") this.renderGrowth();
    if (this.currentView === "rebirth") this.renderRebirth();
    if (this.currentView === "settings") this.renderSettings();
  }

  renderTopStats() {
    const d = this.app.state.ditto;
    const stats = [
      ["레벨", d.level], ["HP", `${fmt(d.currentHp,1)} / ${fmt(d.maxHp,1)}`],
      ["공격", fmt(d.attack,2)], ["방어", fmt(d.defense,2)], ["특공", fmt(d.spAttack,2)],
      ["특방", fmt(d.spDefense,2)], ["스피드", fmt(d.speed,2)], ["공격속도", `${fmt(d.attacksPerSecond,3)}/s`],
      ["환생", this.app.state.rebirthCount],
    ];
    document.querySelector("#topStats").innerHTML = stats.map(([label,value]) => `<div class="stat-card"><div class="stat-label">${label}</div><div class="stat-value">${value}</div></div>`).join("");
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
      <h1 class="page-title">전투</h1>
      <p class="page-desc">이번 환생 풀에서 원하는 포켓몬을 골라 반복 처치하고 메타몽을 성장시킨다.</p>
      <div class="grid-2">
        <div>
          <div class="panel battle-card">
            ${p ? `
              <div class="battle-head">
                <div><div class="enemy-name">${esc(p.name)}</div><div class="meta-line">도감 #${String(p.dex).padStart(4,"0")} · 거리 ${p.distance} · 이번 런 처치 ${killCount}</div></div>
                <span class="rarity-badge rarity-${esc(p.rarity)}">${esc(p.rarity)}</span>
              </div>
              <div class="health-row"><div class="health-label">상대 HP</div><div class="health-track"><div class="health-fill enemy" style="width:${enemyPct}%"></div></div><div class="health-number">${battle ? `${fmt(battle.currentHp,1)} / ${fmt(battle.maxHp,1)}` : "전투 대기"}</div></div>
              <div class="health-row"><div class="health-label">메타몽 HP</div><div class="health-track"><div class="health-fill player" style="width:${playerPct}%"></div></div><div class="health-number">${fmt(d.currentHp,1)} / ${fmt(d.maxHp,1)}</div></div>
              <div>
                <div class="meta-line">프로토타입 성장 보상</div>
                <div class="reward-list">${rewards.map(r => `<span class="reward-chip">${formatReward(r)}</span>`).join("")}</div>
              </div>
              <div class="battle-actions">
                <button id="battleStart" class="btn primary" ${this.app.battle.running ? "disabled" : ""}>전투 시작</button>
                <button id="battleStop" class="btn" ${this.app.battle.running ? "" : "disabled"}>중지</button>
                <button id="choosePokemon" class="btn">다른 포켓몬 선택</button>
              </div>
              <label class="inline-check"><input id="autoRepeat" type="checkbox" ${this.app.autoRepeat ? "checked" : ""}/> 승리 후 같은 포켓몬 자동 재전투</label>
            ` : `<div class="prototype-note">현재 선택된 포켓몬이 없습니다. 포켓몬 탭에서 이번 환생에 등장한 포켓몬을 선택하세요.</div><button id="choosePokemon" class="btn primary">포켓몬 목록 열기</button>`}
          </div>
          <div class="panel">
            <div class="prototype-note">전투 수치·레벨업·성장 보상은 Core Prototype 검증용 임시 규칙입니다. 희귀도/거리/출현 구조와 분리되어 있어 나중에 전투 공식을 교체할 수 있습니다.</div>
          </div>
        </div>
        <div class="panel">
          <h2 class="panel-title">전투 기록</h2>
          <div class="battle-log">${this.app.logs.length ? this.app.logs.map(x => `<div class="log-line ${x.type || ""}">${esc(x.text)}</div>`).join("") : `<div class="log-line">아직 전투 기록이 없습니다.</div>`}</div>
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
      <h1 class="page-title">이번 환생 포켓몬</h1>
      <p class="page-desc">한 포켓몬은 이번 런 풀에 한 항목으로 존재하며, 선택한 뒤 반복 전투할 수 있다.</p>
      <div class="toolbar">
        <input id="pokeSearch" class="input" placeholder="이름 또는 도감번호 검색" value="${esc(this.filters.search)}" />
        <select id="rarityFilter" class="select"><option>전체</option>${CONFIG.rarityOrder.map(r => `<option ${this.filters.rarity===r?"selected":""}>${r}</option>`).join("")}</select>
        <span class="meta-line">표시 ${filtered.length} / 전체 ${pool.length}</span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>포켓몬</th><th>희귀도</th><th>거리</th><th>이번 런 처치</th><th>현재 출현확률</th><th>임시 성장 보상</th><th></th></tr></thead>
        <tbody>${filtered.map(p => {
          const chance = getAppearanceChance(p, this.app.state.rarityProgress);
          const selected = this.app.state.run.selectedPokemonId === p.id;
          return `<tr class="${selected ? "selected-row" : ""}"><td><strong>${esc(p.name)}</strong><div class="meta-line">#${String(p.dex).padStart(4,"0")} · ${esc(p.id)}</div></td><td><span class="rarity-badge rarity-${esc(p.rarity)}">${esc(p.rarity)}</span></td><td>${p.distance}</td><td>${this.app.state.run.killCounts[p.id] || 0}</td><td>${chance == null ? "거리별 1종 확정" : `${(chance*100).toFixed(chance*100 < 0.01 ? 4 : 2)}%`}</td><td>${getPrototypeRewards(p).map(formatReward).join(" · ")}</td><td><button class="small-btn select-pokemon" data-id="${esc(p.id)}">선택</button></td></tr>`;
        }).join("")}</tbody>
      </table></div>`;

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
      <h1 class="page-title">성장</h1>
      <p class="page-desc">희귀도별 거리 진행도는 영구 저장된다. 더 먼 거리 포켓몬을 최초 격파하면 중간 거리를 건너뛰고 즉시 그 거리까지 상승한다.</p>
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
      <h1 class="page-title">환생</h1>
      <p class="page-desc">현재 런의 메타몽 성장과 이번 런 처치 수를 초기화하고 새로운 포켓몬 풀을 생성한다. 희귀도별 거리 진행도와 환생 횟수는 유지된다.</p>
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
      <h1 class="page-title">설정 / 개발 정보</h1>
      <p class="page-desc">GitHub Pages 정적 배포 기준. 서버 없이 브라우저 localStorage를 사용한다.</p>
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
