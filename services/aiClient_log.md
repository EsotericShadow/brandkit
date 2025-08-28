# services/aiClient_vrf — verification log

Inherited from services/aiClient_chk.md

# aiClient_test checklist (phase: [test])

- [x] Exports generateGuide(UserInputs) -> BrandGuide
- [x] Exports rewriteText(textToRewrite, brandGuide) -> string
- [x] Exports checkConsistency(textToCheck, brandGuide) -> ConsistencyReport
- [x] Exports suggestPalette(UserInputs) -> Record<string,string>
- [x] Uses provider from import.meta.env.VITE_AI_PROVIDER (default: gemini)
- [x] Sends requests to /api/generate-guide, /api/rewrite, /api/consistency, /api/suggest-palette
- [x] JSON Content-Type and proper body payloads
- [x] Throws informative errors on non-OK responses
- [x] No secrets hardcoded; inputs validated at server
- [x] Ready for promotion to [vrf] after integration tests

---
Reconstructed notes (exp.md unavailable):
- Replaced direct browser SDK calls with backend routes to protect API keys.
- Shared provider selection via VITE_AI_PROVIDER (default gemini) forwarded with each request.
- Error handling surfaces status/text for easier debugging.

---
Verification updates
- 2025-08-27T16:33Z: Added tests for generateGuide, rewriteText, checkConsistency, suggestPalette with fetch mocking and error cases.
- 2025-08-27T16:33Z: Rewired GuideGenerator and PaletteStep to import services/aiClient_vrf.
- 2025-08-27T16:33Z: All tests green post-promotion.

