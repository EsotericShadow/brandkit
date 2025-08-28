pub const BANNED: &[&str] = &[
  "synergy","leverage","game-changer","disrupt","innovative",
  "cutting-edge","world-class","seamless","robust","next-gen",
  "paradigm shift","empower","unlock","streamline","optimize",
  "best-in-class","revolutionary","groundbreaking","dynamic",
  "core competency","value-added","solution","ecosystem",
];

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
        "You are a senior brand designer and color theorist. Propose a cohesive, accessible color palette grounded in color theory.\n\nRequirements:\n- Use split-complementary or triadic relationships for secondary and accent; avoid analogous picks that are too close to primary.\n- Enforce a minimum hue separation of 40° between primary and both secondary and accent, and between secondary and accent.\n- Prefer a neutral background (unless provided), and ensure WCAG AA contrast (≥ 4.5:1) for text and links on the background.\n- Make the link distinct from primary (small hue offset, lightness adjustment), not identical.\n- Preserve any user-provided roles exactly; only fill missing ones.\n\nContext:\nBrand: {}\nBrand tone traits: {}\nIndustry: {}\nUser-provided colors (keep as-is): {}\n\nOutput STRICT JSON with keys: primary, secondary, accent, neutralLight, neutralDark. Values are hex strings like #RRGGBB.",
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
        "You are a senior brand designer and color theorist. Propose a cohesive, accessible palette following these rules:\n- Use split-complementary or triadic relationships for secondary and accent; avoid picks within 30° of primary unless explicitly requested.\n- Ensure ≥ 40° hue separation between primary and both secondary and accent, and between secondary and accent.\n- Prefer neutral backgrounds unless provided; ensure WCAG AA (≥ 4.5:1) for text and links on background.\n- Make link visually distinct from primary (small hue offset, adjust lightness/saturation).\n- Preserve any user-provided roles exactly. Only output the requested keys and nothing else.\n\nBrand: {}\nBrand tone traits: {}\nIndustry: {}\nUser-provided colors (keep as-is): {}\n\nOutput STRICT JSON with keys: {}. Values are hex strings like #RRGGBB.",
        inputs.brandName, tone, industry, provided, keys
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

