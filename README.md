# 메타몽 시뮬레이터 — Core Prototype 1

PC 웹 방치형/환생형 Pokémon 게임의 첫 플레이 가능한 코어 프로토타입입니다.

## 현재 구현

- XLSX 기준 기본 전투 대상 1,109종 JSON 로딩
- 특별한 폼 226개 연결 데이터 로딩(실제 대체 출현은 아직 비활성)
- 새 런/환생 시 포켓몬 풀 생성
- 흔함: 거리 1~50에서 거리별 무작위 1종, 정확히 50종
- 안흔함 이상: 각 포켓몬 독립 출현 판정
- 희귀도별 독립 거리 진행도
- 진행도 0 시작 + 거리 1은 Distance Decay 없음
- 먼 거리 포켓몬 최초 격파 시 해당 희귀도 진행도 즉시 점프
- 포켓몬 선택 및 단순 자동전투
- 동일 포켓몬 자동 반복전투
- 포켓몬별 이번 런 처치 수
- 프로토타입용 임시 성장 보상 1~3개
- 프로토타입용 레벨/경험치
- localStorage 저장/불러오기
- 세이브 JSON 내보내기/가져오기
- 전체 저장 초기화
- save version 관리

## 아직 의도적으로 미구현

- Pokémon 본가식 전투 공식
- 타입/기술/상태이상/급소/치명타
- 기술 영구 해금 및 4슬롯
- AP/특성 트리
- 아이템
- 상위 환생
- 특별한 폼 실제 대체 출현
- 랜덤성 통제 업그레이드
- 최종 포켓몬별 성장 보상

## GitHub Pages에 올리는 방법

ZIP의 내용물을 저장소 루트에 그대로 올립니다.

루트에 아래처럼 `index.html`, `css`, `js`, `data`가 보여야 합니다.

```text
/
├─ index.html
├─ css/
├─ js/
└─ data/
```

GitHub 저장소에서 **Settings → Pages**로 이동한 뒤, 배포 소스를 `Deploy from a branch`, 브랜치를 `main`, 폴더를 `/(root)`로 설정하면 됩니다.

별도 빌드/npm 설치가 없습니다.

> 주의: `index.html`을 PC에서 파일 더블클릭(`file://`)으로 직접 실행하면 브라우저가 JSON fetch를 차단할 수 있습니다. 이 프로젝트는 GitHub Pages 테스트를 기준으로 만들었습니다.

## 핵심 출현 공식

안흔함 이상은 아래 공식입니다.

```text
exponent = max(0, distance - progress - 1)
effectiveChance = baseChance / decay^exponent
```

따라서 처음 `progress = 0`일 때:

```text
distance 1 → baseChance
distance 2 → baseChance / decay
distance 3 → baseChance / decay²
```

기본 출현률/Decay는 `js/config.js` 한 곳에서 관리합니다.

## 코드 구조

- `js/config.js` — 밸런스/공식 상수
- `js/state.js` — 게임 상태 및 기본 세이브 구조
- `js/pool.js` — 환생 포켓몬 풀 생성/Distance Decay
- `js/battle.js` — 임시 자동전투
- `js/progression.js` — 처치 보상/경험치/거리 진행도
- `js/save.js` — localStorage와 세이브 입출력
- `js/ui.js` — 화면 렌더링
- `js/main.js` — 각 시스템 연결 및 게임 흐름
- `data/pokemon.json` — XLSX `포켓몬` 시트 변환 데이터
- `data/forms.json` — XLSX `폼 데이터` 시트 변환 데이터

## 현재 임시 규칙

전투 능력치, 레벨업 수치, 포켓몬별 성장 보상은 최종 기획이 아닙니다. Core Prototype에서 반복 파밍과 환생 루프가 동작하는지 확인하기 위한 값이며, 희귀도/거리 시스템과 분리되어 있습니다.
