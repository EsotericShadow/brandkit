# GuideGenerator/index_vrf — verification log

Inherited from GuideGenerator_chk.md

# GuideGenerator/index_test checklist (phase: [test])

- [ ] Step state machine flows: Welcome → Basics → Tagline → Mission → Audience → Tone → Palette → Generate
- [ ] Calls aiClient_test.generateGuide and handles errors
- [ ] Edit mode: all handlers (save/cancel, per-field updates) function correctly
- [ ] Export markdown includes all sections
- [ ] Progress bar reflects step; responsive and accessible

---
Inherited notes (from GuideGenerator_exp.md):
# GuideGenerator module — experimental log

Phase: [exp]
Created: 2025-08-27
Owner: team/brandkit

Scope
- Extracted Guide Generator into modular directory structure.
- Added palette suggestion and accessibility checks.

Decisions
- Keep index.tsx as stable entrypoint; internal files are tagged *_exp.
- Contrast checks use WCAG thresholds with badges and color chips.

Open questions / next steps
- Seed linkHover/linkVisited roles by default?
- Add PR template + CONTRIBUTING with phase protocol.

Timeline
- 2025-08-27: Initial extraction and exp tagging, build verified.

---
Verification updates
- 2025-08-27T16:51Z: Added smoke and generation tests for index component. Promoted index_test.tsx to index_vrf.tsx (re-export). Rewired App to use index_vrf. All tests green.
