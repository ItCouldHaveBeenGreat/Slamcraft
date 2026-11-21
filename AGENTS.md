# Development guidance

Read PROJECT_CONTEXT.md and ROADMAP.md before making changes.

- Prioritize a usable mechanics sandbox over production architecture or visual polish.
- Use browser JavaScript and static hosting; no backend or mandatory local server for the user. Keep dependencies minimal. Preserve GitHub Pages compatibility, including repository-relative paths.
- Keep world geometry and occupancy independent of Three.js, DOM, and gameplay rules. Keep rendering and editor controls separate from resource simulation. Extract modules when useful, not merely for abstraction.
- Do not bake power-specific concepts into the world model. Component types and mechanic parameters should be easy to change.
- Preserve integer coordinates, non-overlap, bounds checks, rectangular multi-cell objects and axis rotations. Test rotation, placement, movement and import validation.
- Prioritize phone usability. Distinguish taps from drags/pinches; provide explicit touch-accessible selection, movement and rotation controls; do not require keyboard modifiers.
- Inspect and test the existing HTML before assuming reported features work. Preserve existing layouts/save format where practical; document changes if necessary.
- Keep changes small and testable. Report what was actually tested and what remains unverified. Do not claim a deployment exists until verified.
- Do not implement speculative mechanics prematurely. The next task is making the visual editor usable and hosted; propose gameplay rule choices separately.
