pub const BANNED: &[&str] = &[
  "synergy","leverage","game-changer","disrupt","innovative",
  "cutting-edge","world-class","seamless","robust","next-gen",
  "paradigm shift","empower","unlock","streamline","optimize",
  "best-in-class","revolutionary","groundbreaking","dynamic",
  "core competency","value-added","solution","ecosystem",
  // Extra formality/buzz
  "mission-critical","state-of-the-art","best in class","scalable","bespoke",
  // Overused metaphors
  "lighthouse",
];

#[allow(dead_code)]
pub fn build_guide_prompt(inputs: &crate::models::UserInputs) -> String {
    let tagline_prompt = if inputs.hasExistingTagline.unwrap_or(false) {
        format!(
            "\n**Existing Tagline (User Input):**\n\"{}\"\n\nPlease analyze the user's existing tagline. Provide a rationale for why it is (or isn't) effective. Then, brainstorm two additional, complementary taglines that align with the brand but offer a different angle. The final output for \"taglines\" should be an array of three items: the first item being the user's tagline with your analysis as the rationale, and the next two being new suggestions with their own rationales.\n",
            inputs.existingTagline.clone().unwrap_or_default()
        )
    } else {"\nBrainstorm three unique taglines with rationales.\n".to_string()};

    format!(
        "You are a world-class brand strategist with a reputation for creating bold, memorable, and unique brand identities. You avoid clichés and corporate jargon like the plague. Your task is to generate a complete brand style guide based on the foundational information provided.\n\n**CRITICAL RULE:** Do not use any of the following overused marketing words in your output: {}. Be more creative and specific.\n\n**Brand Name:**\n{}\n\n**Industry:**\n{}\n\n**Core Mission (User Input):**\n{}\n\n**Target Audience (User Input):**\n{}\n\n**Key Tone of Voice Traits (User selected):**\n{}\n\nPlease generate a comprehensive guide. \n- Refine the mission statement to be powerful and concise.\n- Create a detailed audience profile.\n- Develop a practical tone & voice description, anchoring it with a unique metaphor or analogy.\n- Create a practical \"Dos and Don'ts\" list with clear examples.\n- {}\n- Write a compelling elevator pitch.\n\nThe final output must be structured precisely according to the provided JSON schema. Do not include the brand logo or color palette in your response.\n",
        BANNED.join(", "),
        inputs.brandName,
        inputs.industry,
        inputs.mission,
        inputs.audience,
        inputs.toneTraits.join(", "),
        tagline_prompt
    )
}

pub fn build_rewrite_system(guide: &crate::models::BrandGuide, opts: Option<&crate::models::RewriteOptions>) -> String {
    let mut directives = String::new();
    if let Some(o) = opts {
        if let Some(level) = o.aggressiveness { // 1..5
            let guide_text = match level {
                l if l <= 1 => "Conservative rewrite: keep phrasing close to original; fix tone only.",
                2 => "Light rewrite: adjust tone and clarity; keep most phrasing.",
                3 => "Balanced rewrite: adjust tone and clarity; improve flow; keep key structure and meaning.",
                4 => "Bold rewrite: rephrase for style and impact while preserving meaning.",
                _ => "Very bold rewrite: significant rephrasing allowed while preserving intent.",
            };
            directives.push_str(&format!("\n- {}", guide_text));
        } else {
            directives.push_str("\n- Light rewrite: adjust tone and clarity; keep most phrasing.");
        }
        if o.keepLength.unwrap_or(true) { directives.push_str("\n- Keep similar overall length."); }
        if o.preserveStructure.unwrap_or(true) { directives.push_str("\n- Preserve structure (lists, headings, formatting)."); }
        if let Some(notes) = &o.notes { if !notes.trim().is_empty() { directives.push_str(&format!("\n- Additional guidance: {}", notes)); } }
    } else {
        directives.push_str("\n- Light rewrite: adjust tone; keep length and structure similar.");
    }

    format!(
        "You are a brand voice expert for the brand \"{}\". Your task is to rewrite the given text to match the brand's defined voice and style.{}\n\n**Brand Guide for {}:**\n- **Industry:** {}\n- **Mission:** {}\n- **Audience:** {}\n- **Key Tone Traits:** {}\n- **Tone Description:** {}\n- **DO:** {}\n- **DON'T:** {}\n\nRewrite the following text:",
        guide.brandName,
        directives,
        guide.brandName,
        guide.industry,
        guide.mission,
        guide.audience,
        guide.tone.traits.join(", "),
        guide.tone.description,
        guide.tone.dosAndDonts.dos.join(", "),
        guide.tone.dosAndDonts.donts.join(", ")
    )
}

pub fn build_consistency_prompt(text: &str, guide: &crate::models::BrandGuide) -> String {
    format!(
        "You are a brand consistency analyzer for \"{}\". Your task is to analyze the provided text and score its alignment with the brand's style guide.\n\n**Brand Guide for {}:**\n- **Industry:** {}\n- **Mission:** {}\n- **Audience:** {}\n- **Key Tone Traits:** {}\n- **Tone Description:** {}\n- **Dos:** {}\n- **Don'ts:** {}\n\n**Text to Analyze:**\n\"{}\"\n\nPlease provide a score from 0-100, a brief feedback paragraph, and a few actionable suggestions for improvement. Structure your response according to the provided JSON schema.\n",
        guide.brandName,
        guide.brandName,
        guide.industry,
        guide.mission,
        guide.audience,
        guide.tone.traits.join(", "),
        guide.tone.description,
        guide.tone.dosAndDonts.dos.join("; "),
        guide.tone.dosAndDonts.donts.join("; "),
        text
    )
}

#[allow(dead_code)]
pub fn build_palette_prompt(inputs: &crate::models::UserInputs) -> String {
    let provided = if inputs.palette.is_empty() {
        "none".to_string()
    } else {
        let list: Vec<String> = inputs
            .palette
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect();
        list.join("; ")
    };
    let tone = inputs.toneTraits.join(", ");
    let industry = &inputs.industry;
    format!(
        "You are a senior brand designer. Propose a cohesive brand-system palette anchored to the primary color (if provided).\n\nPrinciples:\n- Derive Secondary as an adjacent/analog hue (±12–28°) to the primary with a different lightness/saturation for hierarchy.\n- Derive Accent as a tasteful counterpoint: pick a distant hue family (not a harsh complement). Tune saturation by tone (muted for professional/minimal; richer for bold/playful).\n- Neutrals should be slightly tinted toward the primary hue (very low saturation) for cohesion, not pure grayscale, unless industry requires strict neutrality.\n- Background should be near-white (or near-black in dark mode) with an optional subtle tint.\n- Text must pass WCAG AA (≥ 4.5:1) on background; onPrimary must pass AA on primary (choose white/black accordingly).\n- Links should be related to primary but clearly distinct in hue/lightness; ensure AA contrast.\n- Preserve any user-provided roles exactly; only fill missing ones.\n\nContext:\nBrand: {}\nTone traits: {}\nIndustry: {}\nUser-provided colors (keep as-is): {}\n\nOutput STRICT JSON with keys: primary, secondary, accent, neutralLight, neutralDark. Values are hex strings like #RRGGBB.",
        inputs.brandName, tone, industry, provided
    )
}

pub fn build_palette_prompt_with_roles(inputs: &crate::models::UserInputs, roles: &[String]) -> String {
    let provided = if inputs.palette.is_empty() {
        "none".to_string()
    } else {
        let list: Vec<String> = inputs
            .palette
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect();
        list.join("; ")
    };
    let tone = inputs.toneTraits.join(", ");
    let industry = &inputs.industry;
    let keys = if roles.is_empty() {
        "primary, secondary, accent, background, text, link".to_string()
    } else {
        roles.join(", ")
    };
    format!(
        "You are a senior brand designer. Propose a brand-system palette grounded in the primary color (if provided).\n\nDesign rules:\n- Secondary: adjacent/analog hue (±12–28° from primary), adjust lightness/saturation for hierarchy and readability.\n- Accent: pick a distant but harmonious hue family (not a harsh complement). Saturation depends on tone (muted for professional; richer for bold).\n- Neutrals: use very low-sat tints of the primary hue for neutralLight/neutralDark; prefer true gray only for conservative industries.\n- Background/Text: high accessibility (AA ≥ 4.5:1). Background near-white by default; text chosen for contrast.\n- Link: related to primary yet distinct (small hue offset + lightness/saturation tweak). Must pass AA on background.\n- Respect all user-provided roles exactly. Only output the requested keys and nothing else.\n\nBrand: {}\nTone traits: {}\nIndustry: {}\nUser-provided colors (keep as-is): {}\n\nOutput STRICT JSON with keys: {}. Values are hex strings like #RRGGBB.",
        inputs.brandName, tone, industry, provided, keys
    )
}

// Seeded variant that includes a base (fallback) palette and explicit diversity controls
pub fn build_palette_prompt_with_roles_seeded(
    inputs: &crate::models::UserInputs,
    roles: &[String],
    base: &std::collections::HashMap<String, String>,
    seed: u64,
    preset: Option<&str>,
) -> String {
    let provided = if inputs.palette.is_empty() {
        "none".to_string()
    } else {
        let list: Vec<String> = inputs
            .palette
            .iter()
            .map(|(k, v)| format!("{}: {}", k, v))
            .collect();
        list.join("; ")
    };
    let tone = inputs.toneTraits.join(", ");
    let industry = &inputs.industry;
    let keys = if roles.is_empty() {
        "primary, secondary, accent, background, text, link".to_string()
    } else {
        roles.join(", ")
    };

    // Serialize base palette for context
    let mut base_list: Vec<String> = Vec::new();
    for (k, v) in base.iter() { base_list.push(format!("{}: {}", k, v)); }
    base_list.sort();
    let base_serialized = if base_list.is_empty() { "none".to_string() } else { base_list.join("; ") };

    let preset_lc = preset.unwrap_or("balanced").to_lowercase();

    format!(
        "You are a senior brand designer. Create a brand-system palette grounded in the primary color (if provided), using the BASE palette below as a guardrail.\n\nDesign rules (bounded adjustments):\n- Secondary: adjacent/analog hue (±12–28° from primary), tweak saturation/lightness for hierarchy and usability.\n- Accent: choose a distant but harmonious hue family per industry/tone (avoid harsh complements). Saturation depends on preset: subtle = lower, balanced = moderate, bold = higher.\n- Neutrals: very low-saturation tints toward the primary hue (use true gray only for conservative contexts).\n- Background/Text: must meet WCAG AA ≥ 4.5:1 for text on background.\n- Link: related to primary yet distinct (small hue offset + luma tweak); must pass AA on background.\n- Preserve any user-provided roles exactly.\n- Avoid exact duplicates across roles (e.g., make link not identical to primary).\n- Maintain minimum hue separation of ~40° between primary, secondary, and accent when possible.\n\nVariation controls:\n- Seed: {seed}. Use it to pick among equally valid options so different seeds yield different results, while staying within the above bounds.\n- Preset: {preset}. Allowed values: subtle | balanced | bold. Use it to scale saturation and lightness for the overall vibe.\n\nContext:\nBrand: {brand}\nTone traits: {tone}\nIndustry: {industry}\nUser-provided colors (keep as-is): {provided}\nBASE guardrail palette (use as starting point; apply small deltas where appropriate): {base_serialized}\n\nOutput STRICT JSON with keys: {keys}. Values are hex strings like #RRGGBB. Do not include comments or markdown.",
        seed = seed,
        preset = preset_lc,
        brand = inputs.brandName,
        tone = tone,
        industry = industry,
        provided = provided,
        base_serialized = base_serialized,
        keys = keys,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
use crate::models::*;

    #[test]
    fn prompt_contains_key_fields() {
        let guide = BrandGuide {
            brandName: "Acme".into(),
            industry: "Technology".into(),
            logoUrl: None,
            mission: "Mission".into(),
            audience: "Audience".into(),
            tone: Tone { traits: vec!["Professional".into()], description: "Desc".into(), dosAndDonts: DosAndDonts { dos: vec!["Do".into()], donts: vec!["Don't".into()] } },
            taglines: vec![ Tagline { tagline: "Tag".into(), rationale: "Why".into() } ],
            elevatorPitch: "Pitch".into(),
            palette: {
                let mut m = std::collections::HashMap::new();
                m.insert("primary".into(), "#000".into());
                m.insert("secondary".into(), "#111".into());
                m.insert("accent".into(), "#222".into());
                m.insert("neutralLight".into(), "#eee".into());
                m.insert("neutralDark".into(), "#111".into());
                m
            },
        };
        let p = build_consistency_prompt("hello", &guide);
        assert!(p.contains("Acme"));
        assert!(p.contains("hello"));
        assert!(p.contains("Professional"));
    }
}

