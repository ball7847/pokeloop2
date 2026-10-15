# PokéLoop 2 engine extraction — phase 1

## Baseline and safety

- Source: `pokeloop-dev` (preserved, no direct changes).
- Work branch: `feature/engine-extraction`.
- Current site uses compiled/minified ES modules from `assets/`, loaded by `index.html`.
- No `package.json` was found in the repository root at the start of extraction.
- **The new module is not connected to the live game yet.** Existing behavior is unchanged.

## Verified combat entry point

Source: `assets/game-store-DKXacG7P.js`, store action `challengeSketch:(e,t=!1)=>...`.

On chained fights (`t=true`), the original code retains positive
`combatState.currentPlayerHp` **and** `combatState.statuses.player`.
Otherwise it starts at `playerStats.maxHp` and empty player statuses.
All new fights begin with empty enemy statuses.

## PokéLoop design delta

- Preserve positive current HP in consecutive battles.
- Reset player and enemy temporary combat statuses before **every** fight,
  including automatic consecutive fights and rematches.
- Keep unrelated per-run reward progression untouched.
- Keep original stat scaling and rewards until verified independently.

## Extracted module

- `src/engine/combat/createEncounterState.mjs`: pure encounter-state constructor.
- `tests/combat/createEncounterState.test.mjs`: Node built-in test runner.
- Run locally: `node --test tests/combat/*.test.mjs` (Node 18+).

## Next integration step

1. Establish a reproducible local test harness for the existing bundle.
2. Locate every battle-start path, not only `challengeSketch`.
3. Route actual encounter initialization through the pure function or its
   behaviorally equivalent adapter.
4. Compare encounter fields before/after integration, allowing only the
   intentional player-status reset on chained fights.
5. Check first fight, automatic chaining, manual rematch, different foe,
   remaining HP, and save/load.

Do not claim the status-reset gameplay change is live before integration.
