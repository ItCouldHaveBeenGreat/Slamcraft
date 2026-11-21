# Spaceship Grid Lab — project context

## Goal
Build a dead-simple browser-based sandbox to prototype gameplay based on three-dimensional adjacency. The spaceship theme is a vehicle for experimentation, not a commitment to a full game. Most components occupy one grid cell, but rectangular multi-cell objects (e.g. 2×1×1 or 3×3×3) and rotations are essential. Avoid combat, characters, crafting and progression for now.

## Agreed architecture
- World model: integer 3D grid, component instances, positions, orientation, occupancy and collision validation. Independent of rendering.
- Renderer: Three.js, simple blocks, camera, picking, grid visualization.
- Editor: placement, movement, deletion, rotation, selection, layer controls and inspection.
- Relationship engine: deliberately experimental; expect multiple iterations. Distinguish geometric facts from the gameplay rules that interpret them.
- Resource simulation: independent of rendering, eventually deterministic fixed ticks. Not implemented yet.

The user explicitly agreed that the renderer, editor and world model should be general-purpose, flexible, relatively stable foundations. The relationship engine is expected to evolve.

## Candidate relationship mechanics (not finalized)
- Face contact: objects share a cell face; potentially count shared faces or support directional ports later.
- Distance: shortest distance between occupied cells, initially Manhattan distance as a candidate.
- Network connectivity: graph paths through intermediary components, such as wires or pipes.
- Area of effect: influence within a radius or volume.

Power is the initial example resource. Reactors produce power, batteries store it, and most functional objects consume it. Transmission efficiency should potentially fall with distance; better conductive wires could mitigate loss. Whether power travels through empty space, requires wires, or uses another model is open. Candidate first experiment: efficiency = max(0, 1 - 0.1*d), where d is minimum Manhattan distance between occupied cells; adjacent cells have d=1. This is a proposed rule, not a requirement. Multiple producers, consumers, allocation priorities and storage behavior remain open.

## Initial component palette
| Type | Size | Proposed eventual behavior |
|---|---|---|
| Reactor | 2×2×2 | produces 100 power/tick |
| Battery | 1×1×1 | stores 200 power |
| Engine | 2×1×1 | consumes 30 power/tick |
| Wire | 1×1×1 | network intermediary |
| Hull | 1×1×1 | passive occupancy |

All numbers are experimental defaults.

## Existing implementation
The included index.html is the original single-file visual prototype. It uses Three.js 0.169.0 and OrbitControls from jsDelivr. The intended features are a 12³ grid, camera orbit/zoom, palette, ghost preview, axis rotations, collision and bounds checks, construction layers, inspector, movement/deletion, JSON import/export, example layout. These have not been validated in an interactive browser. Inspect the actual code before relying on them. Instances are represented by id, type, pos and rot arrays; oriented dimensions are derived from type definitions. There is no implemented resource simulation or relationship engine.

## Deployment and device constraint
The user is currently working from an Android phone and wants a hosted browser experience, not a local server. GitHub Pages was proposed: static files in a repository deployed from main/root, with a shareable URL. No repository or deployment has been confirmed. Touch-first controls are important: explicit placement/selection modes, one-finger orbit, pinch zoom, large targets, and avoiding accidental placement during camera gestures.
