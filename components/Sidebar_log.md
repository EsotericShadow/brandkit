# Sidebar_vrf — verification log

Inherited from Sidebar_chk.md

# Sidebar_test checklist (phase: [test])

- [ ] Highlights active view, disables VoiceRewriter until guide exists
- [ ] Navigation callbacks fire correctly
- [ ] Keyboard focus order and ARIA roles are appropriate
- [ ] Works in light/dark themes

---
Reconstructed notes (exp.md unavailable):
- SVG brand mark; nav items map to AppView.
- Disables VoiceRewriter when isGuideGenerated is false.

---
Verification updates
- 2025-08-27T16:48Z: Added tests verifying disabled/enabled states and setView callbacks. Promoted Sidebar_test.tsx to Sidebar_vrf.tsx. All tests green.
