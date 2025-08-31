// Semantic color groups based on hue
export const HUE_GROUPS = {
  red: { min: 345, max: 15 },
  orange: { min: 15, max: 45 },
  yellow: { min: 45, max: 75 },
  'warm-green': { min: 75, max: 105 },
  green: { min: 105, max: 150 },
  cyan: { min: 150, max: 190 },
  blue: { min: 190, max: 250 },
  indigo: { min: 250, max: 275 },
  violet: { min: 275, max: 305 },
  magenta: { min: 305, max: 335 },
  pink: { min: 335, max: 345 },
} as const;

// Min angle between accent/secondary hues (to avoid clashing)
export const MIN_HUE_DELTA_DEG = 40;

// Theme-specific behavior
export const THEME_SETTINGS = {
  earthy: { baseSatMul: 0.95, accLightRange: [0.5, 0.6], secLightRange: [0.52, 0.66] },
  pastel: { baseSatMul: 0.7, accLightRange: [0.68, 0.78], secLightRange: [0.7, 0.82] },
  neon: { baseSatMul: 1.12, accLightRange: [0.48, 0.56], secLightRange: [0.5, 0.6] },
  muted: { baseSatMul: 0.85, accLightRange: [0.52, 0.64], secLightRange: [0.54, 0.66] },
  vintage: { baseSatMul: 0.9, accLightRange: [0.5, 0.62], secLightRange: [0.54, 0.66] },
  monochrome: { baseSatMul: 0.6, accLightRange: [0.5, 0.65], secLightRange: [0.52, 0.68] },
  vibrant: { baseSatMul: 1.12, accLightRange: [0.48, 0.56], secLightRange: [0.5, 0.6] },
} as const;

// Industry groups that affect theme selection
export const INDUSTRY_GROUPS = {
  conservative: [
    'finance', 'bank', 'banking', 'insurance', 'legal',
    'law', 'enterprise', 'b2b', 'health', 'healthcare'
  ],
  playful: [
    'startup', 'tech', 'saas', 'consumer', 'gaming', 'ecommerce'
  ],
  natural: [
    'outdoor', 'outdoors', 'wellness', 'sustainability', 'green', 'agriculture'
  ],
  vintage: ['craft', 'heritage', 'artisan'],
  neon: ['gaming', 'streetwear', 'music', 'festival'],
} as const;

export function hueGroup(h: number): keyof typeof HUE_GROUPS {
  h = ((h % 360) + 360) % 360; // normalize
  if (h < HUE_GROUPS.red.max || h >= HUE_GROUPS.red.min) return 'red';
  for (const [name, { min, max }] of Object.entries(HUE_GROUPS)) {
    if (h >= min && h < max) return name as keyof typeof HUE_GROUPS;
  }
  return 'red'; // fallback
}

export function getThemeSettings(theme: keyof typeof THEME_SETTINGS) {
  return THEME_SETTINGS[theme];
}

export function checkIndustryGroup(industry: string, group: keyof typeof INDUSTRY_GROUPS): boolean {
  return INDUSTRY_GROUPS[group].some(k => industry.toLowerCase().includes(k));
}
