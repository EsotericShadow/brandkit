# Palette Generator — Simplified UX and Shared Contract [vrf]

Status: Verified (build passing)
Owner team (simulated experts):
- Principal UX Architect
- Design Tokens Lead
- Accessibility Specialist
- Visual/Brand Designer
- UX Research & Content

What changed (fluff removed):
- Removed: multi-stage wizard complexity, overwrite/include toggles, advanced templates, swatch-application matrix, deep role add flows.
- Kept: AI-first generation, core roles (primary, background, text, link), preview, accessibility checks.
- Behavior: Suggestions fill only empty fields; will not overwrite user-set values.

Why:
- Users struggled with too many parameters. Core outcome is fast, accessible palettes with consistency across Sidebar and Guide.

User flow (sidebar and guide use the same component):
1) Set Primary (hex or picker)
2) Click “Suggest missing colors”
   - background → neutral (#fff) unless already set
   - text → bestTextOn(background) (contrast-first)
   - link → from primary; darkened if needed for AA contrast
3) Adjust if needed; preview and checks update live
4) Publish guide or continue editing

Cross-app consistency
- Sidebar and Guide use the same PaletteStep_vrf component and the same userInputs.palette object.
- GuideView renders palette entries (no separate color logic), ensuring one source of truth.

AI contract
- Endpoint: /api/suggest-palette?roles=primary,background,text,link
- Request: the full UserInputs object
- Response: Partial record of role→hex (any subset of requested roles)
- Deterministic per (brandName, industry, optional prompt tuning) on server
- Client behavior: do not overwrite non-empty fields; only fill missing

Accessibility rules
- Text/background must pass WCAG AA by default.
- Link/background must pass AA; if not, nudge link darker by ~0.2 (hex-darken safeguard) before falling back to a known accessible blue.

UI surface (shared)
- Four rows (Primary, Background, Text, Link): color input + hex input, with inline validation.
- One action: “Suggest missing colors” (disabled until Primary is set).
- Preview block (heading, body, link) and Accessibility checks panel.

Developer notes
- All color math lives in utils/color_vrf.ts.
- The component keeps file size < 225 lines for maintenance (see PaletteStep_vrf.tsx).
- Suggestions are additive-only; remove a value to allow overwrite on next suggestion.

Next iterations (optional)
- Add locks per role; add theme (dark) preview toggle; add minimal secondary/accent roles behind a single “Add role” control without advanced options.

