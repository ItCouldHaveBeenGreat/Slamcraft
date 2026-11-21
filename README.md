# Slamcraft
Mechanics prototyping 

## Spaceship Grid Lab

Slamcraft is a static 3D editor for arranging components on a 30 × 30 × 30 grid.
Tap the active layer in **Place** mode or tap a block in **Select** mode. Drag
to orbit, pinch to zoom, and use the build-layer controls to stack components.
Selected blocks can be moved, rotated, or deleted. **Export JSON** and
**Import JSON** save and reload layouts.

## Power

Load **Power example**, then select either engine. The wire-fed engine receives
30 power per tick and runs at 100%. The hull-fed engine receives 6 and runs at
20%. Delete a transmitter and undo the deletion to see the engine lose and
regain power. In the same example, select the battery and tap **Step 1 second**
to charge it. Delete the reactor to see the battery supply the wire-fed engine.
Each battery stores up to 200 J, accepts up to 30 W, and delivers up to 20 W.
At 90% charging efficiency, 30 J of input stores 27 J. Discharge has no storage
loss. Intermediate blocks still apply their transmission losses. Layout exports
include stored charge. The inspector shows power rates for the next step.

Imports from the old 12-cell grid retain their existing reactor
footprints. Newly placed reactors are 3 × 3 × 3.

Face contacts connect automatically. A block's forwarding capacity is shared
across routes and its efficiency reduces the power it forwards. Consumers split
shared capacity in proportion to demand. The solver uses the least-loss route
available at each allocation step and can switch to another when a route fills.
Earlier allocations remain in place, so some complex networks could benefit
from a different overall routing. Calculations run in a browser worker after
layout edits. The Objects panel shows the latest solve time.

## GitHub Pages

In **Settings → Pages**, choose **Deploy from a branch**, then **main** and
**/ (root)**. The editor uses repository-relative assets and loads Three.js
0.169.0 from jsDelivr. No build step is required.

The grid model lives in `world.mjs`, the Three.js view in `renderer.mjs`, and
the editor controls in `editor.mjs`. Run the model and power checks with
`node --test --test-reporter=spec`.
