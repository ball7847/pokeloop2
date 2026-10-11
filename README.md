# PokéLoop 2 — Rejected Draft adaptation

## Imported bundle
- All **362 files** from the restored Rejected Draft capture have been uploaded alongside this README (363 repository files total at verification).
- Main entry: `index.html` → `assets/main-DksMQC7H.js`.
- The 11 relative JS/CSS references found in the main entry bundle are present.
- This is a production/minified web build, **not** the original React/TypeScript project.

## Known limitations
- `assets/universeImageWorker-BVrVQ8px.js` is not included in the capture; image-related functionality may fall back or fail.
- The version-check URL in the bundled JS still points to `https://kuzzigames.com/rejected_draft/version.json`.
- Some dynamically requested language resources may be absent.
- **Browser runtime, battle flow and save behavior have not been verified**.
- The repository is **public** as of the latest check. Set it private before relying on it as a non-public workspace.

## Run locally
Clone or download repository contents. From its root, run:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000/` in a browser. Avoid opening `index.html` using `file://` because JS modules may not load.

## Next development milestones
1. Browser smoke test: load the initial game and identify missing assets.
2. Fix worker/resource paths and eliminate the original game's version polling and telemetry.
3. Verify gallery, battle, shop, redraw and saves.
4. Refactor a small feature safely before adding PokéLoop-specific changes.
