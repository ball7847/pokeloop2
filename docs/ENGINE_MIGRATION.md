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
3. Pure-module tests in `tests/combat/` cover encounter boundaries and
   player attack timing; `.github/workflows/engine-tests.yml` is configured
   to run Node syntax checks and tests on supported events.

## Important limitations

- GitHub commits and content presence have been confirmed. An actual
  successful CI run or in-browser playtest has **not** yet been verified.
- Only two targeted pieces have been extracted. Enemy attack timing,
  damage calculation, status application, rewards, save/load and all
  other combat logic still live in the original compiled bundle.
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
