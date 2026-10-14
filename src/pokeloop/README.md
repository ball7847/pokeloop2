# PokéLoop 2 — migration workbench

**Branch:** `pokeloop-dev`. The original `main` deployment is deliberately unchanged.

## Implemented as isolated modules

- `core.js`: 18 Pokémon types, 10 fixed tiers, effectiveness (0× → 0.25×), multiplicative assimilation, per-run 18-energy state, first milestone at 1,025, sequential tier unlock, 50%-retained locked energy, dual-type reward split, equal per-type generator allocation, tier concept averaging, Redraw resets and persistent Normal milestones/assimilation/Stellar Energy.
- `pokemon.js`: initial sample species roster, boss *metadata only*, and a provisional progression-sensitive encounter filter.
- `shop-mapping.json`: all 47 existing tool IDs + 43 combat upgrade IDs mapped to 18 types; **mapping is provisional**, retains original numeric cost fields and effects by reference.
- `core.test.mjs`: core invariant checks. From repo root: `node src/pokeloop/core.test.mjs` (Node.js 22+).

## NOT YET connected / NOT YET implemented

The original Rejected Draft HTML, rendered UI, game-store and combat flow still run their original code. These new modules currently do **not** change what a player sees at the default URL.

Remaining integration work:
1. Replace original sketch/enemy encounter data with Pokémon species (preserving the existing battle engine/stat bounty design).
2. Bind the original game-store to the 18-energy state and its 10-tier unlocks; migrate saves safely.
3. Replace 10 currency shop references with the 90 mapped type-energy purchases, including automatic buying and tier-wide discounts.
4. Adapt generator outputs and milestone/concept cascade to 18 types and 10 production tiers without breaking polynomial growth.
5. Rework rewards using original formula + **calibrated** 10 conversion weights. Weights still require measurement; do not silently pick arbitrary values.
6. Replace Quintessence UI/upgrade-currency labels with Stellar Energy, and integrate the existing permanent skill tree.
7. Integrate Redraw spawn tracking / assimilation payout with battle and save systems; amount per spawn still undecided.
8. Implement Pokédex, progression goals, and boss battles once required data/thresholds are agreed.
9. Test browser startup, save/load, long-duration offline progression, and multiple Redraw cycles.

## Invariants for integration

- Missing a tier: 50% energy banked, 50% lost; unclaimed bank cleared on Redraw.
- Concept production: **average** member type outputs; normal energy generators: **split** total equally across member types.
- When a tier unlocks, stored energy for that tier becomes immediately spendable and contributes to milestones.
- 1st milestone = 1,025 for all types. Later milestone thresholds and concept multipliers must follow original game's actual formulas, not guesses.
- Same-tier discount affects every member type, without multiplying production.
- Preserve original combat, individual stat upgrade effects, shop tool behaviors, and skill tree until verified replacements exist.
- No claims of end-to-end feature completion until default game UI and store actually run the new modules.
