# Roadmap

## 0.1 — Visual editor (initial code supplied, unverified)
Validate startup and dependency resolution; test camera, placement, rotations, collision checks, layer selection, inspector, movement, deletion, sample and JSON round trip. Check desktop and narrow mobile viewports. Add focused model tests where useful.

## 0.2 — Mobile and hosting (next priority)
Make controls touch-first, responsive and usable without Shift or hover. Separate camera gestures from placement. Improve vertical construction and placement against existing faces if useful. Establish GitHub Pages deployment once the user supplies or creates a repository. Document the live URL only once verified.

## 0.3 — First mechanics experiment
Add spatial queries separately from the editor. Visualize reactor-to-engine relationships and distance. Add a simple configurable distance-loss model and an inspector showing delivered power. Define allocation rules explicitly before implementing multi-consumer behavior. Add batteries and deterministic tick controls.

## Agreed first playable acceptance criteria
1. Open a webpage and see an empty 3D grid.
2. Place a reactor and engines at different positions.
3. Rotate and move components.
4. See which engines receive power and how much.
5. Move an engine farther away and observe efficiency change.
6. Add a battery and observe charge over simulation ticks.
7. Save and reload the configuration.

## Later experiments
Contact-based transfer, wire networks, path losses, directional ports, heat, cooling, shielding, structural support and overlapping influence fields. These are possibilities, not committed features.
