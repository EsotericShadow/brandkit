use serde::{Deserialize, Serialize};

use std::collections::HashMap;

pub type Palette = HashMap<String, String>;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tagline { pub tagline: String, pub rationale: String }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DosAndDonts { pub dos: Vec<String>, pub donts: Vec<String> }

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tone { pub traits: Vec<String>, pub description: String, pub dosAndDonts: DosAndDonts }

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BrandGuide {
    pub brandName: String,
    pub industry: String,
    pub logoUrl: Option<String>,
    pub mission: String,
    pub audience: String,
    pub tone: Tone,
    pub taglines: Vec<Tagline>,
    pub elevatorPitch: String,
    pub palette: Palette,
}

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInputs {
    pub brandName: String,
    pub industry: String,
    pub logoUrl: Option<String>,
    pub hasExistingTagline: Option<bool>,
    pub existingTagline: Option<String>,
    pub mission: String,
    pub audience: String,
    pub toneTraits: Vec<String>,
    pub palette: Palette,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyReport { pub score: i32, pub feedback: String, pub suggestions: Vec<String> }

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GenerateGuideRequest { pub provider: Option<String>, pub inputs: UserInputs }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewriteOptions { pub aggressiveness: Option<i32>, pub keepLength: Option<bool>, pub preserveStructure: Option<bool>, pub notes: Option<String> }

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RewriteRequest { pub provider: Option<String>, pub textToRewrite: String, pub brandGuide: BrandGuide, pub options: Option<RewriteOptions> }

#[allow(non_snake_case)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConsistencyRequest { pub provider: Option<String>, pub textToCheck: String, pub brandGuide: BrandGuide }

