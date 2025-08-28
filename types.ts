
export interface Palette {
  [key: string]: string | undefined;
  primary?: string;
  secondary?: string;
  accent?: string;
  neutralLight?: string;
  neutralDark?: string;
}

export interface GuideFontPairing {
  name?: string; // optional label like "Poppins + Lora"
  heading: string; // CSS font-family stack (e.g., assetsFor(...).css)
  body: string;    // CSS font-family stack
}

export interface BrandGuide {
  brandName: string;
  industry: string;
  logoUrl?: string;
  mission: string;
  audience: string;
  tone: {
    traits: string[];
    description: string;
    dosAndDonts: {
      dos: string[];
      donts: string[];
    };
  };
  taglines: {
    tagline: string;
    rationale: string;
  }[];
  elevatorPitch: string;
  palette: Palette;
  fontPairings?: GuideFontPairing[]; // User-managed font pairings for the brand
}

export interface UserInputs {
    brandName: string;
    industry: string;
    logoUrl?: string;
    hasExistingTagline?: boolean;
    existingTagline?: string;
    mission: string;
    audience: string;
    toneTraits: string[];
    palette: Palette;
}

export interface ConsistencyReport {
  score: number; // A score from 0 to 100
  feedback: string;
  suggestions: string[];
}

export enum AppView {
  GUIDE_GENERATOR = 'GUIDE_GENERATOR',
  PALETTE_GENERATOR = 'PALETTE_GENERATOR',
  VOICE_REWRITER = 'VOICE_REWRITER',
  FONT_LIBRARY = 'FONT_LIBRARY',
}

export interface AppState {
    view: AppView;
    brandGuide: BrandGuide | null;
    isGenerated: boolean;
}