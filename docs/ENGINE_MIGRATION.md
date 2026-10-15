# PokéLoop 2 — engine extraction progress

## Branch policy
- Original baseline: `pokeloop-dev`, unchanged.
- Active work: `feature/engine-extraction`.
- `main` must not be modified.

## Implemented in development branch

1. `createEncounterState.mjs` now initializes encounters through
   `assets/game-store-DKXacG7P.js` → `challengeSketch`.
   On every battle, temporary player/enemy statuses start empty.
   Positive remaining player HP persists on chained fights.
2. `playerAttackTiming.mjs` now calculates the player attack interval.
   Its formula is extracted from the original combat tick and preserves:
   Slow, Haste, BananaSlip, Flow State, first-attack gating,
   and glossary-unlock gating.
3. `enemyAttackTiming.mjs` now calculates the enemy attack interval using the original Slow/Haste/BananaSlip order. The combat tick on the development branch calls it directly.
4. `inspirationMultiplier.mjs` is integrated into both player and enemy EnergyWave damage paths. It preserves the original Decimal arithmetic for the Inspiration stack multiplier only; the remaining damage pipeline has not been extracted.
5. `resolveCombatHit.mjs` is a transparent adapter for the original `rn` damage resolver exported from `data-skill-tree-DvCthzIY.js`. All six calls in the game-store bundle now go through this adapter with the same arguments and return value. It does not alter damage, critical hits, defense, counters, or type effectiveness.
6. Pure-module tests in `tests/combat/` cover encounter boundaries and
   player attack timing; `.github/workflows/engine-tests.yml` is configured
   to run Node syntax checks and tests on supported events.

## Important limitations

- GitHub commits and content presence have been confirmed. An actual
  successful CI run or in-browser playtest has **not** yet been verified.
- Five targeted pieces have been extracted. Full damage resolution,
  status application, rewards, save/load and remaining combat logic still live
  in the original compiled bundle.
- Future changes should preserve the original encounter data shape and
  all high-precision numerical values.

## Verification checklist before merging

- Node syntax check for the original bundle and extracted .mjs modules.
- All pure tests passing.
- Open the development branch as a deployable preview and inspect
  browser console/network (the `../src/...` imports must load).
- Verify first fight, consecutive fight, automatic next fight, rematch,
  switching foe, victory, defeat, and save/reload.
- Check that player HP carryover is unchanged but all temporary status
  stacks are cleared at fight start.
- Check Haste/Slow/BananaSlip/Flow State timings and enemy AI.
- Compare default combat pacing and loot against baseline.

**Do not merge or call gameplay complete until this checklist is verified.**

## Damage-path limitation
The complete original damage resolver (`rn` alias) remains bundled in `data-skill-tree-DvCthzIY.js`. The adapter is an integration seam, **not** an extracted damage formula. Do not add Pokémon type effectiveness until ordinary hits, reflected hits, counters, and every damage type are mapped and regression-tested.
