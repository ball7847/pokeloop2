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

## Armor mitigation extraction (phase 9)

The original primary-hit function `Aa` reduces damage after Block,
Surrealism and armor penetration, but before percentage Absorb,
ParalysisExposed, Electrocute, Frailty and Brittle.

`src/engine/combat/armorMitigation.mjs` is now wired into the
`data-skill-tree-DvCthzIY.js` primary-hit resolver at the old
`r.max(0,xt.eq(0)?h:h.minus(xt))` statement. It preserves Decimal
arithmetic and retains original upstream effective-armor calculation,
including immunity checks, penetration and Surrealism.

Added isolated armor tests and call-site assertions.
This is **not** a complete rewrite of armor, critical strike or absorption,
and no Pokémon type multiplier has been added.

The CI integration-test assertions were corrected to tolerate multiple
imports in the damage resolver bundle instead of requiring a specific
import to come first. Tests and browser play still require a confirmed run.

## Phase 10 — Absorb and critical-hit inspection

The primary-hit function `Aa` applies critical-hit and glancing-blow
logic **before** Dodge, Parry, Block, Armor, and Absorb. A normal critical
hit uses `critDmg` (default 150%) and may apply a defender-related
modifier; GlancingBlow can instead halve the hit. Accuracy can amplify
damage to 150% when it bypasses a dodge/parry. Changing this calculation
without verifying those branches risks combat balance.

The original Absorb stage runs **after Armor**, and subtracts
`damage * min(absorb,100)/100` whenever effective Absorb is positive.
Surrealism can bypass Absorb. Its calculation is now in
`src/engine/combat/absorbMitigation.mjs`, integrated into the compiled
primary-hit function without altering the existing logs or stage order.

The independent tests cover 25%, 100%+, and zero-damage conditions.
Integration tests assert the Absorb callsite. Tests have been **written,
not independently confirmed passing**; actual browser play and other
attack paths remain unverified.

**Next gate:** run CI successfully and smoke-test encounter flow in a
real browser before expanding into Pokémon mechanics.

## Phase 11 — regression validation gate

- Isolated module functions were fetched from GitHub and executed in a
  JavaScript tool sandbox with eight representative cases:
  encounter HP/stacks, player/enemy attack timing, Inspiration,
  variance, armor, Absorb and original damage call-through.
  All eight representative checks passed. **This is not equivalent
  to running the repository's full Node test suite.**
- Added `tests/integration/moduleGraph.test.mjs`: traverses relative JS
  imports from the original HTML entrypoint, checking file existence.
- Updated GitHub Actions to check the syntax of all extracted engine/test
  modules plus both major compiled bundles; all unit tests and both
  integration scripts are now included.

Remaining release blockers:
1. Confirm a green GitHub Actions run (no run returned by the available
   commit workflow lookup at the time of writing).
2. Browser test an actually deployed development branch, not `main`.
3. Compare battle outcome, HP carryover and auto-battle after refresh.
4. Only then begin the ten-Pokémon vertical slice.

## Phase 12 — Browser smoke-test automation

Added `tests/integration/browserSmoke.mjs` and a Chromium
`browser-smoke` job to GitHub Actions. It serves the checked-out
development branch with a local HTTP server, loads `index.html`,
requires visible root content, imports the extracted engine modules,
and fails for uncaught page errors / failed local HTTP responses.

**Status:** smoke-test *configuration* has been committed. This chat
environment cannot directly run a GUI browser against GitHub, and no
successful GitHub Actions execution has been confirmed. A successful
smoke job is needed before concluding the branch renders.

This is a rendering/import smoke test, not a full combat simulation.
Combat actions, status reset, rewards and save/load require separately
verified interactive tests.
