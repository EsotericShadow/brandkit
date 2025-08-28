# Testing and Verification Sequence (test → vrf)

This is the authoritative checklist for migrating from [test] to [vrf]. We will only proceed top-to-bottom, and build after each unit. Every *_log.md must inherit the full history from *_chk.md (and exp notes where available) before removing previous-phase files.

Global readiness checklist (preconditions)
- [x] All *_exp code/docs removed
- [x] All *_test files present for active modules
- [x] All *_chk.md exist and include reconstructed notes where exp.md was missing
- [x] Frontend build is clean (npm run build)
- [x] Backend build is clean (cargo build)

Per-file workflow (repeat exactly for each module)
- [ ] Ensure *_chk.md is complete for this file
- [ ] Run typecheck (tsc --noEmit) and record results in *_chk.md
- [ ] Add/execute unit tests (when test stack is added) and record results
- [ ] Promote: create {filename}_vrf.ts(x|rs) from *_test
- [ ] Create {filename}_log.md and inherit entire *_chk.md (and exp notes) into "History"
- [ ] Rewire imports to *_vrf
- [ ] Remove *_test and *_chk.md
- [ ] Build (npm run build / cargo build) and record results in *_log.md

Execution order (check items off as they verify)

0) Entry + App
- [ ] index.tsx (entry only; no rename)
- [ ] App_test.tsx → App_vrf.tsx (+ App_log.md)

1) Common UI
- [x] Button_test.tsx → Button_vrf.tsx (+ Button_log.md)
- [x] Spinner_test.tsx → Spinner_vrf.tsx (+ Spinner_log.md)
- [x] Card_test.tsx → Card_vrf.tsx (+ Card_log.md)
- [x] EditableSection_test.tsx → EditableSection_vrf.tsx (+ EditableSection_log.md)

2) Guide Generator (steps first)
- [ ] BasicsStep_test.tsx → BasicsStep_vrf.tsx (+ BasicsStep_log.md)
- [ ] TaglineStep_test.tsx → TaglineStep_vrf.tsx (+ TaglineStep_log.md)
- [ ] MissionStep_test.tsx → MissionStep_vrf.tsx (+ MissionStep_log.md)
- [ ] AudienceStep_test.tsx → AudienceStep_vrf.tsx (+ AudienceStep_log.md)
- [ ] ToneStep_test.tsx → ToneStep_vrf.tsx (+ ToneStep_log.md)
- [ ] PaletteStep_test.tsx → PaletteStep_vrf.tsx (+ PaletteStep_log.md)

2b) Guide Generator (wrappers & glue)
- [ ] ProgressBar_test.tsx → ProgressBar_vrf.tsx (+ ProgressBar_log.md)
- [ ] Icons_test.tsx → Icons_vrf.tsx (+ Icons_log.md)
- [ ] WizardStepWrapper_test.tsx → WizardStepWrapper_vrf.tsx (+ WizardStepWrapper_log.md)
- [ ] GuideView_test.tsx → GuideView_vrf.tsx (+ GuideView_log.md)
- [ ] index_test.tsx → index_vrf.tsx (+ GuideGenerator_log.md)

3) Color & Fonts
- [ ] ColorChecker_test.tsx → ColorChecker_vrf.tsx (+ ColorChecker_log.md)
- [ ] FontLibrary_test.tsx → FontLibrary_vrf.tsx (+ FontLibrary_log.md)
- [ ] SuggestedFonts_test.tsx → SuggestedFonts_vrf.tsx (+ SuggestedFonts_log.md)
- [ ] data/fonts_test.ts → fonts_vrf.ts (+ fonts_log.md)
- [ ] utils/color_test.ts → color_vrf.ts (+ color_log.md)

4) Voice & Navigation
- [ ] VoiceRewriter_test.tsx → VoiceRewriter_vrf.tsx (+ VoiceRewriter_log.md)
- [ ] Sidebar_test.tsx → Sidebar_vrf.tsx (+ Sidebar_log.md)

5) Services (frontend)
- [ ] aiClient_test.ts → aiClient_vrf.ts (+ aiClient_log.md)
- [ ] geminiService.ts (either remove or convert to _vrf with stub + log)

6) Backend (Rust)
- [ ] adapters/schemas_test.rs → schemas_vrf.rs (+ schemas_log.md)
- [ ] adapters/gemini_test.rs → gemini_vrf.rs (+ gemini_log.md)
- [ ] adapters_test.rs → adapters_vrf.rs (+ adapters_log.md)
- [ ] models_test.rs → models_vrf.rs (+ models_log.md)
- [ ] prompts_test.rs → prompts_vrf.rs (+ prompts_log.md)
- [ ] routes_test.rs → routes_vrf.rs (+ routes_log.md)
- [ ] main_test.rs → main_vrf.rs (+ main_log.md); update Cargo.toml [[bin]] path

Notes
- We will not proceed to the next item until the current one is fully done with a clean build, and its *_chk.md has a test log appended and/or its *_log.md has been created with inherited history.

