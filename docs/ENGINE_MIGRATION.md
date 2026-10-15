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

## Phase 13 — stronger Chromium regression smoke

The browser smoke script now imports eight extracted combat modules in Chromium
and performs 12 runtime assertions, covering chained HP carryover, fresh
statuses, previous-combat immutability, Flow State, player/enemy attack
intervals, Inspiration, damage variance, armor, Absorb and original damage
delegation. This supplements the earlier check that the app root renders.

The workflow also uploads a screenshot artifact if the Chromium smoke fails.

**Still unverified:** A green Actions run and the full interactive combat
flow (start/kill/auto-next/rematch/save/refresh). The browser test executes
representative module logic, not scripted game battles. Do not merge the
branch or claim that the full game works solely on this smoke-test setup.

## Phase 14 — live store initialization probe

The Chromium test now imports the **actual** compiled game-store module
and checks the existing exported store (`ve as u`) for `getState()`,
`challengeSketch` and `combatState`. The test will fail if the app shell
renders but the original combat state/action is missing. In total the
browser script reports 13 runtime checks.

The GitHub connector returned no pull-request workflow runs or commit
statuses for the previous head. Importantly, the available run lookup
only returns PR-triggered runs, so an empty result is **not proof that
push-triggered GitHub Actions did not execute**.

No authenticated Chromium execution or manual gameplay result has been
observed here. Next milestone remains confirming a green workflow and
running real combat scenarios on a branch-isolated preview.

## Phase 15 — live encounter action smoke

Added an actual `challengeSketch('stick man', true)` probe to the Chromium
smoke test. Before invoking the production store action, the test seeds
a temporary previous-combat state (half HP, Haste 700, Inspiration 55,
enemy Poison 4), disables discovery animations, and clears the encounter
cooldown. It then asserts that the encounter starts, the chained HP
persists, and both status maps are empty. The test attempts to restore
the original store state after assertions.

This verifies the live encounter action only **when the Chromium CI job
actually runs and passes**. It is not a victory/defeat/reward/auto-next
playtest, and a successful outcome has not yet been observed.

## Phase 16 — manual rematch smoke

The Chromium smoke now exercises two consecutive calls to the actual
store action `challengeSketch('stick man', ...)`:

1. Chained encounter (`true`): carries 50% remaining HP, discards player
   Haste/Inspiration and enemy Poison stacks.
2. Manual rematch (`false`): seeds a completed encounter with 25% remaining
   HP, then requires a new fight at full HP and with no player/enemy
   status stacks.

These assertions have been **committed, but are not confirmed passing
in Chromium**. Victory/reward settlement and automatic next-fight
transitions are not yet covered by a deterministic real-store test.

## Phase 17 — real reward settlement contract

Chromium smoke testing now invokes the **production**
`processCombatRewards('stick man', 1, {}, {}, 0, 'combat')` action in its
isolated browser context with zero synthetic stat/currency reward inputs.
It checks the per-sketch win count, per-run count, total win count, and
`combatState.lastVictory` reference, then restores the previous Zustand
state. This focuses on victory **bookkeeping**, not numeric reward amounts,
which will need baseline comparisons.

The new test has been committed but has **not** been observed passing in
a running Chromium job. The automated next-target selection and complete
victory/death transition remain unverified; no live-branch merger is justified.

## Phase 18 — next-target queue integration test

Added a browser action test that seeds an active fight against
`stick man`, temporarily enables queue functionality, then calls the
real `queueNextChallenge('fountain_pen_duelist')` action. It checks:
- the queued sketch ID and `mode === 'next'`;
- preservation of `restoreAutoChallenge === true`;
- pausing `autoChallengeActive` during the switch.

The test restores the previously captured store state afterward.
This covers **queue creation**, not actual enemy death, queue consumption,
automatic encounter start, reward settlement timing or save persistence.
As with prior browser tests, no green CI run has yet been independently
observed in this environment.

## Phase 19 — locate actual automatic victory transition

The real frame-based battle coordinator is in
`assets/main-DksMQC7H.js`, **not** just the `game-store` module.
It performs the frame tick, handles victories via
`processCombatRewards`, respects a queued target before ordinary
auto-retry, and starts queued encounters through
`challengeSketch(d.sketchId)`.

Key semantic distinction observed:
- **Automatic retry of the same enemy** uses `b(y.id,!0)` (chained flag
  true), which allows remaining HP carryover while encounter statuses
  reset.
- **Switching to an explicitly queued next enemy** uses
  `challengeSketch(d.sketchId)` without the chained flag, meaning
  the ordinary full-HP encounter policy is used. This is inherited
  behavior and has **not** been changed.

A static integration assertion suite at
`tests/integration/combatOrchestration.test.mjs` now tracks both
paths and is wired into GitHub Actions. It is not an executed
end-to-end victory simulation. The Chromium job still needs a
confirmed passing run, and reward calculations / auto battle outcomes
need hands-on regression.

## Phase 20 — first ten-Pokémon prototype data (not yet rendered)

Added `src/pokemon/prototypeRoster.mjs` with ten unevolved species,
canonical type arrays, and a temporary one-to-one mapping to the first
ten original enemy templates. All ten template IDs were checked against
the source data-sketches catalog and were found.

The `overlayPrototypePokemon` helper changes presentation fields only,
while leaving the template ID, rarity, original stat object and rewards
untouched. This is a design safeguard for future UI integration; it has
**not** yet been connected to the game's gallery, spawning or combat UI.

Added `tests/pokemon/prototypeRoster.test.mjs` and included it in the
CI workflow. Roster pairings are explicitly temporary, awaiting
playtesting and later per-planet 1:N species selection.

No type-effectiveness bonus or evolutionary spawn replacement is active.

## Phase 21 — live 10-Pokémon catalog presentation

The ten-species prototype roster is now connected to the original
`assets/data-sketches-B3moo1Ps.js` catalog. Original sketch entries
retain their **stable original ID, exact stats/reward objects, rarity,
appearance logic, and existing original artwork**. For mapped entries,
the shared catalog object's visible `name` becomes the Pokémon's Korean
name plus Korean type labels (e.g. `이상해씨 · 풀/독`), and a
`pokemon` metadata field is attached. Both gallery and battle components
already consume the shared catalog objects.

The original name-to-ID mapping is constructed **before** overlaying names
for compatibility with original source-name references. Nonprototype
entries remain unchanged. Pokémon art is **not** implemented, so these
entries still show Rejected Draft artwork.

The Chromium smoke script asserts that the actual exported catalog now
contains the species name, type labels, original ID and combat stats.
GitHub Actions checks the syntax of the modified catalog as well.
A complete browser gameplay pass remains unconfirmed; Pokémon moves,
type effectiveness, and evolution are not yet active.

## Phase 22 — full Pokémon type effectiveness core

Added `src/pokemon/typeEffectiveness.mjs`: the full 18-type modern
attacking matchup chart with single- and dual-defender effectiveness,
4×/¼× interactions, and absolute immunities. Unknown or duplicate
defending type input is rejected. The matching Node tests are in
`tests/pokemon/typeEffectiveness.test.mjs`, already selected by the
existing `tests/pokemon/*.test.mjs` CI configuration.

The module source was fetched from the development branch and executed
in an isolated JS environment: all 324 single-type combinations and
six representative dual/immunity cases were checked successfully.
These representative checks **do not** prove GitHub Actions or
Chromium has passed.

**Not implemented:** move-specific attacking types, STAB, Ditto's
assimilation multiplier, actual damage-pipeline integration, Pokémon
move selection or evolution. Do not apply the effectiveness factor to
the entire combat resolver wrapper, because it also handles counters,
reflections and unrelated status damage. Attach it at the individual
typed-hit stage once that mechanic is specified and verified.

## Phase 23 correction — remove unauthorized moves (phase 24)

**Agreed design: no Pokémon move slots.** PokéLoop 2 reuses the original
Rejected Draft automatic attack, speed, damage, critical, status, and
counter systems. Pokémon's 18-type effectiveness and Ditto assimilation
will be incorporated later into the original attack path according to
the established design, *without* individual four-move assignments.

The previous Phase 23 addition was a design mistake and has been
reverted from the development branch:
- Deleted `src/pokemon/prototypeMoves.mjs`.
- Deleted `tests/pokemon/prototypeMoves.test.mjs`.
- Removed the move import and `pokemon.moves` metadata from the live
  `assets/data-sketches-B3moo1Ps.js` catalog.
- Updated the browser smoke assertion to reject move metadata.

The 18-type lookup and original combat resolver were left unchanged.
The separately identified **temporary species-to-template allocation**
and evolved-Pikachu issue are not fixed by this rollback and must not
be treated as agreed final choices.

All modifications remain on `feature/engine-extraction`. Successful
full browser gameplay is still not confirmed.

## Phase 25 — correct prototype violations and disable unauthorized live roster

The original game catalog is restored: the prototype overlay import and
the code that overwrote source sketch names and appended Pokémon metadata
have been removed from `assets/data-sketches-B3moo1Ps.js`.
Until species/template assignments are confirmed, **the live game keeps
original enemy names, images, spawn rules, statistics and rewards**.

The draft prototype roster remains as offline data but now has nine
candidates, not ten: Pikachu (evolved from Pichu) was deleted. No new
replacement was invented. The nine remaining species/template pairs
are **unapproved placeholders**, not authoritative allocation decisions;
they are not loaded by the live catalog. Roster tests were updated to
ensure Pikachu is excluded. Browser smoke assertions now require that
the baseline Stick Man entry is unchanged.

**Remaining unresolved:** selecting the final Pokémon candidates based
on agreed original enemy difficulty tiers and the original allocation
workbook; how types are assigned to original automatic attacks (there
are no four-move slots); Ditto assimilation; evolution probability (later);
all CI/browser regression and save/load verification.

This section supersedes earlier Phase 20/21 language claiming live
Pokémon labels, and the previous prototype test expectation of ten.

## Phase 26 — design invariants and approved cosmology

**Actual changes:**
- `src/pokemon/worldLayers.mjs` now encodes the ten user-approved
  conceptual layers as immutable data, with exactly 18 Pokémon types
  appearing once each. The agreed `우주 여행`, `우주 여행 떠나기`,
  `별가루 (SP)`, and separate `타입 에너지` terminology are preserved.
- `tests/pokemon/worldLayers.test.mjs` checks the layer partition and
  independent currencies. A fetched-source JavaScript sanity check
  confirmed ten layers and 18 distinct types; this is not a full CI run.
- `tests/integration/designGuards.test.mjs` is included in CI and
  prevents accidentally reintroducing prototype four-move imports,
  mutating original enemy names, or disconnecting the original combat
  start function.

**No new combat mechanic added.** The world-layer module is not wired into
prestige; its purpose is to prevent further deviations from the approved
design. The agreed attack model is still original Rejected Draft auto combat,
with future type/assimilation modifiers but NO four-move selection.

**Remaining blockers:** full CI/browser run, save compatibility, accurate
type/assimilation integration after recovering precise original agreement,
prototype mapping approval (nine offline placeholders), first real playable
Pokémon visuals, layer progression, and Star Dust prestige economy. These
must not be reported as complete.

## Phase 27 — close uncovered training-status path and CI triggers

Reviewed the original `startTrainingDummy` battle-entry implementation:
training encounters already reset `statuses.player`, `statuses.enemy`,
`pendingCombatEffects`, and Flow state, and initialize player HP to
maximum. No change to the original combat behavior was required.
Added a regression assertion in `tests/integration/designGuards.test.mjs`
to preserve these facts alongside the normal `challengeSketch` reset.

Also fixed the GitHub Actions pull-request path filter to react to
`src/pokemon/**` and `assets/data-sketches-B3moo1Ps.js`.
Previously a PR touching only these paths would not trigger CI even
though it could break the game. Evaluated source-based checks verified
the training reset tokens and the CI paths; **no green browser or
GitHub Actions run has been observed**.

Still outstanding: verifying actual runtime + saves, selecting approved
species and type assignments, integrating original auto-hit effectiveness
with the previously agreed Ditto assimilation formula, and implementing
actual space-travel economy. No unapproved balance changes made.

## Phase 28 — fix a confirmed contradiction with original agreed type rules

The previously written `src/pokemon/typeEffectiveness.mjs` was
WRONG for PokéLoop 2: it treated original type immunities as zero.
The user's earlier confirmed design and the pre-existing authoritative
`src/pokeloop/core.js` instead use **0.25× for a type immunity**, with
dual-type multipliers multiplied. For example electric vs Water/Ground
is 2 × 0.25 = 0.5, NOT zero.

Fixed this by making the newer type module a small validated adapter
to `baseEffectiveness` in the **already existing**
`src/pokeloop/core.js`, not by maintaining two independent charts.
Updated its Pokémon test expectations. Evaluated the fetched source
in JavaScript and compared all **5,832** ordered single/dual matchup
inputs against the authoritative core; **zero mismatches**. Also
validated the existing agreed Fire 200% assimilation example (9×).

Further important discovery: `src/pokeloop/core.js`,
`src/pokeloop/pokemon.js`, and their tests ALREADY existed on the
development branch and contain previously agreed type assimilation,
Redraw encounter-based gains, generation and evolution exclusion.
Previously added `src/pokemon/*` files must not supersede them.
The engine test workflow now also executes
`node src/pokeloop/core.test.mjs` and
`node src/pokeloop/pokemon.test.mjs`, and PR paths include
`src/pokeloop/**`.

This checks standalone math only: no live typed-hit integration,
browser green result, or save-load validation is claimed. Future
implementation must use the authoritative core instead of guessing
new formulas, and original automatic attacks must remain unchanged
apart from the approved modifiers.

## Phase 29 correction — redundant type multiplier removed

Previous phase 29 attempted to compute `baseEffectiveness × assimilationMultiplier`
as separate extra multipliers on an original attack. This was not aligned
with the user's agreed rule that **type interaction belongs to the
assimilation system**. The module `src/pokemon/originalAutoAttackTypes.mjs`
and its related test have now both been deleted.

No Pokémon modifier has been attached to the live combat damage resolver.
Existing automatic attacks remain unchanged. Before any integration,
the agreed relationship between attack type and assimilation must be
recovered from the earlier design rather than inferred. In particular,
the old separate-function multiplication is **not authorized** for live
combat.

The old `src/pokeloop/core.js` primitives remain untouched, but
their coexistence must not be interpreted as approval to multiply
them when implementing combat. Full browser and save tests remain
unverified.

## Phase 30 — eliminate duplicate tier definitions and guard the agreed combat boundary

`src/pokemon/worldLayers.mjs` no longer duplicates the 10 world tier
definitions. Its display metadata now derives directly from the
pre-existing authoritative `src/pokeloop/core.js` `TIERS` constant.
An independent execution of both retrieved sources confirmed 10 tiers,
18 nonrepeating types, and full name/type equality.

`tests/integration/designGuards.test.mjs` now explicitly rejects
previously removed extra original-auto-attack multiplier integrations
and verifies that world tiers are core-derived. Original compiled
combat, rewards and saves were not changed.

**Correction:** the approved type-interaction/assimilation combat
formula has *not* yet been recovered in sufficient detail to safely
connect a multiplier to the original damage resolver. Do not treat
older phase 29 multiplication as the accepted rule. Browser/CI
success is still not confirmed; do not report game play as tested.

## Phase 31 — deduplicate dormant Pokémon modules

Reviewed the development branch's known runtime entrypoints, engine
tests, world-layer helpers, and the pre-existing PokéLoop modules.
The source of truth for the PokéLoop type chart, assimilation rules,
18 types, 10 tiers, and 29-species provisional roster continues to be
`src/pokeloop/core.js` / `src/pokeloop/pokemon.js`.

Removed dormant competing modules and their dedicated tests:
- `src/pokemon/prototypeRoster.mjs` (nine arbitrarily paired enemies;
  superseded by the existing 29-species encounter-roll model).
- `src/pokemon/typeEffectiveness.mjs` (redundant adapter around
  `src/pokeloop/core.js`).
- the two corresponding `tests/pokemon/*` tests.

Fixed `tests/pokemon/worldLayers.test.mjs` to import `TYPES`
directly from `core.js` instead of the deleted duplicate wrapper.
`worldLayers.mjs` remains a **read-only display adapter** derived
from the authoritative `TIERS`; it is not an independent ruleset.

No compiled original combat, encounter catalog, reward, or save file
was modified in this cleanup. The earlier type-immunity rule and
no-four-moves policy are unchanged.

**Verification boundary:** fetched the workflow and relevant runtime/test
sources and checked them for remaining imports of deleted modules.
The new source references are consistent in the inspected files.
This does not establish that GitHub Actions or browser integration
passed; broad repository-wide references outside the inspected files
are not yet excluded.

## Phase 32 — executed isolated source tests and improved browser diagnostics

Fetched the authoritative `src/pokeloop/core.js` / `pokemon.js` /
`templates.js`, their corresponding test files, and the
`worldLayers` module/test from this exact feature branch.

Executed assertions in a JavaScript isolate after stripping ES module
imports/exports and providing assertion shims:
- `src/pokeloop/core.test.mjs`: passed.
- `src/pokeloop/pokemon.test.mjs`: passed.
- `tests/pokemon/worldLayers.test.mjs`: passed (three test blocks).

This is a **partial source-level execution**, not an actual
`node --test` run or a Playwright/Chromium playthrough. Container
network access to GitHub is unavailable, so the full remote checkout
and browser test could not be run in this environment. Neither a green
push CI nor a successful browser run has been verified.

Updated the CI workflow to print the static server log and publish both
its server log and browser screenshot when the Chromium job fails.
Existing branch push triggers remain intact.

## Phase 33 — per-run Pokémon encounter adapter, with original combat preserved

Added `src/pokeloop/runEncounters.js`: a Redraw snapshot builder
that uses the existing `src/pokeloop/pokemon.js` independent roll
and its already provisional rarity-matched template allocation.
Each selected species becomes a separate `dex-*` encounter view,
even if multiple species reuse the same original template.
Original reference stats and reward objects are passed through,
the source catalog is untouched, and evolved forms/bosses remain
ineligible. An encounter lookup does not re-roll.

Added `tests/pokemon/runEncounters.test.mjs` (three tests).
These tests were evaluated directly against fetched source in a
JavaScript execution isolate; all three passed. Also expanded
`tests/integration/browserSmoke.mjs` to create snapshots using
the real compiled sketch catalog during its next Chromium run and
check that the original enemy objects are unmodified.

**Important:** this is NOT yet wired to the live Zustand
`availableSketches` state or redraw persistence. The 29-species
roster/template allocation remains provisional and must not be
presented as approved or as a working playable Pokédex.
The browser smoke test was changed but has not been observed running
successfully here; live battle/save functionality remains original.
