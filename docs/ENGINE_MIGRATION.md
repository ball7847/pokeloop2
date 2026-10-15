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

## Damage resolver audit (phase 7)

The bundled source `assets/data-skill-tree-DvCthzIY.js` exports its
attack resolver as `pp as aa`, imported by game-store as `rn`.
Its signature is:

`pp(attackerStats, defenderStats, defenderHp, defenderMaxHp, attackerHp, attackerMaxHp, attackAmount, events, target, attackerStatuses, defenderStatuses, counter=false, emitEvents=true, context={}, flags=0, extra=0)`

**Source inspection confirms that this resolver combines** miss and
status conditions (including Paralysis and Hinder), attack redirection
(Hypnotize), multi-strikes, damage outcomes, counterattacks, status
application, reflections (Thorns), and lifesteal. Consequently adding
type-effectiveness at the outer `resolveCombatHit` boundary without
specifying which attack variants it applies to would be unsafe.

We are **not** assigning one universal multiplier to all outgoing
damage. Planned next: locate the primary-hit damage calculation inside
the resolver, isolate its multiplier placement, then compare ordinary,
counter, reflected, and status damage paths.

## CI improvement (phase 7)

The earlier workflow checked that the encounter initializer import was the
very first import, which stopped being true when later modules were added.
It now checks all module/test syntax and executes
`tests/integration/combatBundle.test.mjs` to validate the five imports,
expected call counts, and original resolver export.
No green workflow run has yet been confirmed.

## Primary-hit damage extraction (phase 8)

Inspection located the actual hit computation in `Aa` inside the compiled
`assets/data-skill-tree-DvCthzIY.js` module. The outer resolver `pp`
iterates over multi-strikes and delegates the per-hit damage to `Aa`.

The existing calculation contains these phases, in observed order:
Inspiration buff -> min/max damage variance -> conditional Execute and
Berserk multipliers -> critical strike or glancing blow -> dodge/parry/
accuracy -> block -> Surrealism interactions -> armor/armor penetration
-> absorb and further effects.

**Integrated:** `src/engine/combat/damageVariance.mjs` replaces exactly
one variance calculation in `Aa`. Decimal arithmetic, default 75%-125%
variance, and random consumption only when bounds differ are preserved.
The remainder of the damage pipeline remains compiled and unmodified.

Next: test the actual compiled resolver and compare deterministic damage
scenarios before extracting further stages or adding Pokémon effectiveness.
No successful CI or browser-playtest result has been independently observed.
