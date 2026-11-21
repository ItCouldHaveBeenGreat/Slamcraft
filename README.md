# Slamcraft
Mechanics prototyping 

## Spaceship Grid Lab

Slamcraft is a static 3D editor for arranging components on a 12 × 12 × 12 grid.
Tap the active layer in **Place** mode or tap a block in **Select** mode. Drag
to orbit, pinch to zoom, and use the build-layer controls to stack components.
Selected blocks can be moved, rotated, or deleted. **Export JSON** and
**Import JSON** save and reload layouts.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, then **main** and
**/ (root)**. The editor uses repository-relative assets and loads Three.js
0.169.0 from jsDelivr. No build step is required.

The grid model lives in `world.mjs`, the Three.js view in `renderer.mjs`, and
the editor controls in `editor.mjs`. Run model checks with
`node --test --test-reporter=spec tests/world.test.mjs`.
