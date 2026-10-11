# PokéLoop 2 — Rejected Draft adaptation

This repository is reset and ready for a locally restored Rejected Draft production build.

## Current state
- Original PokéLoop files removed from the current `main` tree.
- Import of game assets is **pending**; this repository does not yet contain the playable game.
- Source bundle: `rejected_draft_local.zip` extracted from the authorized HAR capture (362 files, around 15 MB unpacked).
- Its bundled JavaScript is production/minified output, not original TypeScript/React source.

## Import on Windows (once)
1. Download `rejected_draft_local.zip` from the ChatGPT conversation.
2. Install Git and clone this repository: `git clone https://github.com/ball7847/pokeloop2.git`
3. Extract the ZIP to a temporary directory.
4. Copy the **contents** of the extracted `rejected_draft_local` directory into the cloned `pokeloop2` directory (so `index.html` is at repository root).
5. From `pokeloop2`, run:
   ```powershell
   git add -A
   git commit -m "Import Rejected Draft restored production bundle"
   git push origin main
   ```

## Run locally
From the repository root:
```sh
python -m http.server 8000
```
Open `http://localhost:8000/`. Opening `index.html` directly through `file://` may block ES modules.

## Verification caveats
- The archived initial HTML references `assets/main-DksMQC7H.js` and related modules.
- Some locale chunks (including `locale-ko-DjT9W6T1.js`) were not present in the capture, and may require later acquisition.
- Browser runtime functionality has **not** been validated. JavaScript syntax and key static asset references alone are insufficient proof of a working game.
- Do not assume the GitHub repository is private: verify visibility before importing any code that must remain non-public.

## Development plan
1. Restore & smoke-test game locally.
2. Fix missing static resources and module paths.
3. Document battle, progression, gallery, store and persistence internals.
4. Refactor incrementally for Pokémon mechanics.
