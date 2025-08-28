export function parseColor(color: string): [number, number, number] | null {
  color = color.trim();
  if (color.startsWith('#')) {
    color = color.substring(1);
    if (color.length === 3) {
      color = color.split('').map(c => c + c).join('');
    }
    if (color.length === 6) {
      const r = parseInt(color.substring(0, 2), 16);
      const g = parseInt(color.substring(2, 4), 16);
      const b = parseInt(color.substring(4, 6), 16);
      if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
      return [r, g, b];
    }
  }
  const rgbMatch = color.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    if ([r, g, b].some(v => Number.isNaN(v) || v < 0 || v > 255)) return null;
    return [r, g, b];
  }
  return null;
}

function luminance(r: number, g: number, b: number): number {
  const a = [r, g, b].map(v => {
    let x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function contrastRatio(color1: string, color2: string): number | null {
  const rgb1 = parseColor(color1);
  const rgb2 = parseColor(color2);
  if (!rgb1 || !rgb2) return null;
  const lum1 = luminance(rgb1[0], rgb1[1], rgb1[2]);
  const lum2 = luminance(rgb2[0], rgb2[1], rgb2[2]);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// WCAG thresholds
const AA_NORMAL = 4.5;
const AAA_NORMAL = 7.0;
const AA_LARGE = 3.0;
const AAA_LARGE = 4.5;

export type ContrastAssessment = {
  ratio: number | null;
  AA: boolean;
  AAA: boolean;
  AALarge: boolean;
  AAALarge: boolean;
};

export function assessContrast(fg: string, bg: string): ContrastAssessment {
  const ratio = contrastRatio(fg, bg);
  if (ratio == null) {
    return { ratio: null, AA: false, AAA: false, AALarge: false, AAALarge: false };
  }
  return {
    ratio,
    AA: ratio >= AA_NORMAL,
    AAA: ratio >= AAA_NORMAL,
    AALarge: ratio >= AA_LARGE,
    AAALarge: ratio >= AAA_LARGE,
  };
}

// Utility helpers for palette operations
function clamp01(n: number): number { return Math.max(0, Math.min(1, n)); }
function toHex(n: number): string { const s = Math.round(n).toString(16).padStart(2, '0'); return s; }

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): [number, number, number] | null {
  const p = parseColor(hex);
  return p ? p : null;
}

export function mix(hex1: string, hex2: string, t: number): string {
  const a = hexToRgb(hex1); const b = hexToRgb(hex2);
  if (!a || !b) return hex1;
  t = clamp01(t);
  const r = a[0] + (b[0] - a[0]) * t;
  const g = a[1] + (b[1] - a[1]) * t;
  const bl = a[2] + (b[2] - a[2]) * t;
  return rgbToHex(r, g, bl);
}

export function lighten(hex: string, t: number): string {
  return mix(hex, '#ffffff', clamp01(t));
}
export function darken(hex: string, t: number): string {
  return mix(hex, '#000000', clamp01(t));
}

// HSL helpers for better visual tuning
export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  let [r, g, b] = rgb.map(v => v / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max - min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; // wrap
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function adjustHue(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  return hslToHex(hsl.h + delta, hsl.s, hsl.l);
}

export function adjustSaturation(hex: string, factor: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const s = clamp01(hsl.s * factor);
  return hslToHex(hsl.h, s, hsl.l);
}

export function adjustLightness(hex: string, delta: number): string {
  const hsl = hexToHsl(hex);
  if (!hsl) return hex;
  const l = clamp01(hsl.l + delta);
  return hslToHex(hsl.h, hsl.s, l);
}

export function bestTextOn(bg: string): string {
  const rBlack = contrastRatio('#000000', bg) ?? 0;
  const rWhite = contrastRatio('#ffffff', bg) ?? 0;
  if (rBlack >= 4.5 || rWhite >= 4.5) return rBlack >= rWhite ? '#000000' : '#ffffff';
  return rBlack >= rWhite ? '#000000' : '#ffffff';
}

// Shared hex validators used by palette derivation
export function isValidHex(v: string): boolean {
  return /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test((v || '').trim());
}
export function normalizeHex(v: string): string | null {
  const t = (v || '').trim();
  if (!isValidHex(t)) return null;
  let h = t.startsWith('#') ? t.slice(1) : t;
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toLowerCase()}`;
}

// Color-theory helpers
export const MIN_HUE_DELTA_DEG = 40; // ensure accent/secondary are not too close to primary
const TARGET_CONTRAST = 4.5; // WCAG AA normal text

function hueDelta(a: number, b: number): number {
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

export function hueDistance(hexA?: string | null, hexB?: string | null): number | null {
  if (!hexA || !hexB) return null;
  const a = hexToHsl(hexA);
  const b = hexToHsl(hexB);
  if (!a || !b) return null;
  return hueDelta(a.h, b.h);
}

function ensureContrast(hex: string, bg: string): string {
  let out = hex;
  let safety = 0;
  while ((contrastRatio(out, bg) ?? 0) < TARGET_CONTRAST && safety < 10) {
    // If bg is light, darken the color via HSL for more natural shifts; if dark, lighten it.
    const bgHsl = hexToHsl(bg);
    const isBgLight = bgHsl ? bgHsl.l >= 0.5 : true;
    out = isBgLight ? adjustLightness(out, -0.06) : adjustLightness(out, 0.06);
    safety++;
  }
  return out;
}

export function deriveExtendedRoles(primaryHex: string, backgroundHex?: string): {
  accent: string;
  secondary: string;
  neutralLight: string;
  neutralDark: string;
} {
  // Backward-compatible default: balanced vibe and split/triadic bias
  return deriveExtendedRolesAesthetic(primaryHex, backgroundHex, { toneTraits: [], industry: '' });
}

export type Vibe = 'subtle' | 'balanced' | 'bold';

export function vibeFromTone(toneTraits: string[]): Vibe {
  const t = toneTraits.map(s => s.toLowerCase());
  const boldKeys = ['bold', 'vibrant', 'energetic', 'playful', 'innovative', 'disruptive', 'confident'];
  const subtleKeys = ['calm', 'trustworthy', 'minimal', 'minimalist', 'refined', 'elegant', 'soft', 'approachable'];
  if (t.some(x => boldKeys.includes(x))) return 'bold';
  if (t.some(x => subtleKeys.includes(x))) return 'subtle';
  return 'balanced';
}

export type Scheme = 'analogous' | 'split' | 'triadic' | 'complementary';

export function schemeFromContext(toneTraits: string[], industry: string): Scheme {
  const t = toneTraits.map(s => s.toLowerCase());
  const ind = (industry || '').toLowerCase();
  const conservativeInd = ['finance', 'bank', 'banking', 'insurance', 'legal', 'law', 'enterprise', 'b2b', 'health', 'healthcare'];
  const playfulInd = ['startup', 'tech', 'saas', 'consumer', 'gaming', 'ecommerce'];
  const naturalInd = ['outdoor', 'outdoors', 'wellness', 'sustainability', 'green', 'agriculture'];
  if (conservativeInd.some(k => ind.includes(k)) || t.some(x => ['calm','trustworthy','minimal','professional'].includes(x))) {
    return 'analogous';
  }
  if (naturalInd.some(k => ind.includes(k)) || t.some(x => ['grounded','earthy','warm'].includes(x))) {
    return 'analogous';
  }
  if (playfulInd.some(k => ind.includes(k)) || t.some(x => ['bold','playful','vibrant','innovative'].includes(x))) {
    return 'split';
  }
  // default mildly interesting but not chaotic
  return 'split';
}

// Semantic theme categories inferred automatically
export type Theme = 'earthy' | 'pastel' | 'neon' | 'muted' | 'vintage' | 'monochrome' | 'vibrant';

export function themeFromContext(toneTraits: string[], industry: string): Theme {
  const t = toneTraits.map(s => s.toLowerCase());
  const ind = (industry || '').toLowerCase();
  const earthyKeys = ['earthy','grounded','organic','natural','warm','rustic'];
  const pastelKeys = ['pastel','gentle','soft','friendly','approachable','calm'];
  const neonKeys = ['neon','edgy','youthful','street','bold','electric'];
  const mutedKeys = ['muted','minimal','professional','understated','subtle'];
  const vintageKeys = ['vintage','heritage','classic','retro','timeless'];
  const monoKeys = ['monochrome','mono','black','white','grayscale'];
  const vibrKeys = ['vibrant','playful','energetic','lively'];

  if (earthyKeys.some(k => t.includes(k)) || ['outdoor','outdoors','wellness','sustainability','green','agriculture'].some(k => ind.includes(k))) return 'earthy';
  if (pastelKeys.some(k => t.includes(k))) return 'pastel';
  if (neonKeys.some(k => t.includes(k)) || ['gaming','streetwear','music','festival'].some(k => ind.includes(k))) return 'neon';
  if (vintageKeys.some(k => t.includes(k)) || ['craft','heritage','artisan'].some(k => ind.includes(k))) return 'vintage';
  if (monoKeys.some(k => t.includes(k))) return 'monochrome';
  if (mutedKeys.some(k => t.includes(k)) || ['finance','legal','enterprise','b2b'].some(k => ind.includes(k))) return 'muted';
  if (vibrKeys.some(k => t.includes(k)) || ['startup','tech','saas','ecommerce'].some(k => ind.includes(k))) return 'vibrant';
  // fallback based on scheme tendency
  return 'muted';
}

// Aesthetic, tone/industry-aware derivation
export function deriveExtendedRolesAesthetic(
  primaryHex: string,
  backgroundHex: string | undefined,
  opts: { toneTraits: string[]; industry: string; variant?: number }
): { accent: string; secondary: string; neutralLight: string; neutralDark: string } {
  const p = hexToHsl(primaryHex) || { h: 220, s: 0.6, l: 0.5 };
  const bgNorm = (backgroundHex && hexToHsl(backgroundHex)) ? (normalizeHex(backgroundHex as any) as string) : '#ffffff';
  const pH = p.h, pS = p.s, pL = p.l;
  const vibe = vibeFromTone(opts.toneTraits);
  const scheme = schemeFromContext(opts.toneTraits, opts.industry);
  const theme = themeFromContext(opts.toneTraits, opts.industry);

  let sMul = vibe === 'bold' ? 1.15 : vibe === 'subtle' ? 0.9 : 1.0;
  let lAccent = vibe === 'bold' ? Math.max(0.45, Math.min(0.58, pL + 0.02)) : vibe === 'subtle' ? Math.max(0.56, Math.min(0.7, pL + 0.06)) : Math.max(0.5, Math.min(0.62, pL + 0.04));
  let lSecondary = vibe === 'bold' ? Math.max(0.5, Math.min(0.65, pL + 0.06)) : vibe === 'subtle' ? Math.max(0.58, Math.min(0.72, pL + 0.08)) : Math.max(0.52, Math.min(0.68, pL + 0.07));

  // Theme-based tuning
  if (theme === 'earthy') {
    sMul *= 0.95;
    lAccent = Math.max(0.48, Math.min(0.6, lAccent));
    lSecondary = Math.max(0.52, Math.min(0.66, lSecondary));
  } else if (theme === 'pastel') {
    sMul *= 0.7; // softer
    lAccent = Math.max(0.65, Math.min(0.78, pL + 0.1));
    lSecondary = Math.max(0.7, Math.min(0.82, pL + 0.12));
  } else if (theme === 'neon' || theme === 'vibrant') {
    // Keep saturation lively but avoid overly harsh, neon-like pairings by lowering the floor
    sMul = Math.max(sMul, 1.12);
    lAccent = Math.max(0.48, Math.min(0.56, pL + 0.01));
    lSecondary = Math.max(0.5, Math.min(0.6, pL + 0.03));
  } else if (theme === 'muted') {
    sMul *= 0.85;
    lAccent = Math.max(0.52, Math.min(0.64, lAccent));
    lSecondary = Math.max(0.54, Math.min(0.66, lSecondary));
  } else if (theme === 'vintage') {
    sMul *= 0.9;
    lAccent = Math.max(0.5, Math.min(0.62, lAccent));
    lSecondary = Math.max(0.54, Math.min(0.66, lSecondary));
  } else if (theme === 'monochrome') {
    sMul *= 0.6;
    lAccent = Math.max(0.5, Math.min(0.65, lAccent));
    lSecondary = Math.max(0.52, Math.min(0.68, lSecondary));
  }

  const build = (h: number, sMulLocal: number, targetL: number) => {
    // Slightly relaxed saturation caps to allow calmer results when primary is intense
    const s = clamp01(Math.max(0.3, Math.min(0.85, pS * sMulLocal)));
    const l = clamp01(targetL);
    return hslToHex(h, s, l);
  };

  // Curated designer chord patterns with per-band preferences
  const v = (opts.variant ?? 0);
  type HueBand = 'red'|'orange'|'yellow'|'warm-green'|'green'|'cyan'|'blue'|'indigo'|'violet'|'magenta'|'pink';
  const bandOf = (h: number): HueBand => {
    const norm = (x: number) => ((x % 360) + 360) % 360;
    const inRange = (val: number, a: number, b: number) => {
      const x = norm(val), lo = norm(a), hi = norm(b);
      return lo <= hi ? (x >= lo && x <= hi) : (x >= lo || x <= hi);
    };
    const hh = norm(h);
    if (inRange(hh, 345, 360) || inRange(hh, 0, 15)) return 'red';
    if (inRange(hh, 15, 45)) return 'orange';
    if (inRange(hh, 45, 75)) return 'yellow';
    if (inRange(hh, 75, 105)) return 'warm-green';
    if (inRange(hh, 105, 150)) return 'green';
    if (inRange(hh, 150, 190)) return 'cyan';
    if (inRange(hh, 190, 250)) return 'blue';
    if (inRange(hh, 250, 275)) return 'indigo';
    if (inRange(hh, 275, 305)) return 'violet';
    if (inRange(hh, 305, 335)) return 'magenta';
    return 'pink';
  };

  type CuratedPattern = {
    name: string;
    bands: HueBand[] | 'any';
    secondaryOffset: number;
    accentOffset: number;
    accentSatMul?: number; // relative to sMul
    secondarySatMul?: number; // relative to sMul
    accentLightness?: number; // absolute target 0..1
    secondaryLightness?: number; // absolute target 0..1
  };

  const curated: Record<Theme | 'default', CuratedPattern[]> = {
    // Grounded, warm, designer-friendly analogish riffs
    earthy: [
      { name: 'Terracotta Grove', bands: ['warm-green','green','cyan'], secondaryOffset: +20, accentOffset: +40, accentSatMul: 0.95, secondarySatMul: 0.9, accentLightness: 0.56, secondaryLightness: 0.6 },
      { name: 'Amber Clay', bands: ['blue','indigo','violet','magenta','pink'], secondaryOffset: +25, accentOffset: +35, accentSatMul: 0.95, secondarySatMul: 0.9, accentLightness: 0.55, secondaryLightness: 0.6 },
      { name: 'Olive Bark', bands: 'any', secondaryOffset: -20, accentOffset: +30, accentSatMul: 0.9, secondarySatMul: 0.9, accentLightness: 0.54, secondaryLightness: 0.6 },
    ],
    vintage: [
      { name: 'Burgundy & Cream', bands: ['blue','indigo','violet'], secondaryOffset: +20, accentOffset: +45, accentSatMul: 0.9, secondarySatMul: 0.9, accentLightness: 0.56, secondaryLightness: 0.6 },
      { name: 'Forest Gold', bands: ['cyan','blue'], secondaryOffset: -25, accentOffset: +35, accentSatMul: 0.9, secondarySatMul: 0.9, accentLightness: 0.55, secondaryLightness: 0.62 },
    ],
    pastel: [
      { name: 'Coastal Pastel', bands: ['blue','indigo','violet'], secondaryOffset: +25, accentOffset: +50, accentSatMul: 0.65, secondarySatMul: 0.65, accentLightness: 0.75, secondaryLightness: 0.72 },
      { name: 'Moss Blush', bands: ['warm-green','green','cyan','yellow'], secondaryOffset: -20, accentOffset: +35, accentSatMul: 0.68, secondarySatMul: 0.65, accentLightness: 0.74, secondaryLightness: 0.7 },
    ],
    muted: [
      { name: 'Editorial', bands: 'any', secondaryOffset: +30, accentOffset: +60, accentSatMul: 0.85, secondarySatMul: 0.8, accentLightness: 0.6, secondaryLightness: 0.62 },
      { name: 'Analog Drift', bands: 'any', secondaryOffset: -30, accentOffset: +45, accentSatMul: 0.85, secondarySatMul: 0.8, accentLightness: 0.6, secondaryLightness: 0.6 },
    ],
    monochrome: [
      { name: 'Near Mono', bands: 'any', secondaryOffset: -15, accentOffset: +15, accentSatMul: 0.6, secondarySatMul: 0.55, accentLightness: 0.6, secondaryLightness: 0.6 },
      { name: 'Graphite Duo', bands: 'any', secondaryOffset: +20, accentOffset: -20, accentSatMul: 0.55, secondarySatMul: 0.6, accentLightness: 0.58, secondaryLightness: 0.62 },
    ],
    neon: [
      // Tone stays lively but pairings are reined in to avoid harsh clashes
      { name: 'Club Split', bands: 'any', secondaryOffset: +30, accentOffset: +150, accentSatMul: 1.2, secondarySatMul: 1.1, accentLightness: 0.54, secondaryLightness: 0.58 },
      { name: 'Hyper Tech', bands: 'any', secondaryOffset: -40, accentOffset: +120, accentSatMul: 1.18, secondarySatMul: 1.08, accentLightness: 0.55, secondaryLightness: 0.58 },
    ],
    vibrant: [
      { name: 'Playful Split', bands: 'any', secondaryOffset: +30, accentOffset: +150, accentSatMul: 1.15, secondarySatMul: 1.05, accentLightness: 0.55, secondaryLightness: 0.6 },
      { name: 'Candy Pop', bands: 'any', secondaryOffset: +40, accentOffset: +110, accentSatMul: 1.12, secondarySatMul: 1.05, accentLightness: 0.56, secondaryLightness: 0.6 },
    ],
    default: [
      { name: 'Safe Split', bands: 'any', secondaryOffset: +30, accentOffset: +150, accentSatMul: 1.0, secondarySatMul: 0.95 },
      { name: 'Alt Split', bands: 'any', secondaryOffset: -30, accentOffset: +150, accentSatMul: 1.0, secondarySatMul: 0.95 },
    ],
  };

  const primaryBand = bandOf(pH);
  const list = (curated[theme] || curated['default']).filter(p => p.bands === 'any' || (p.bands as HueBand[]).includes(primaryBand));
  const pool = list.length > 0 ? list : curated['default'];
  const picked = pool[(v + Math.floor(pH / 15)) % pool.length];

  let secondaryH = pH + picked.secondaryOffset;
  let accentH = pH + picked.accentOffset;

  // Role-specific sat multipliers and (optional) lightness overrides from pattern
  let accSatMulBase = sMul * (picked.accentSatMul ?? 1.0);
  let secSatMulBase = sMul * (picked.secondarySatMul ?? 0.95);
  let lAccentOverride = picked.accentLightness;
  let lSecondaryOverride = picked.secondaryLightness;

  // If pattern result is too close or clashes, fallback to scheme-driven defaults
  const tooClose = (a:number,b:number) => hueDelta(a,b) < MIN_HUE_DELTA_DEG;
  if (tooClose(secondaryH, pH) || tooClose(accentH, pH) || tooClose(secondaryH, accentH)) {
    // Determine hues by scheme
    accentH = pH + 150; secondaryH = pH + 30;
    if (scheme === 'triadic') { accentH = pH + 120; secondaryH = pH - 120; }
    else if (scheme === 'complementary') { accentH = pH + 180; secondaryH = pH + 30; }
    else if (scheme === 'analogous') { accentH = pH + 35; secondaryH = pH - 25; }
    // Variant-driven orientation and micro-jitter for diversity (no UI)
    if (scheme === 'split') { if (v % 2 === 1) { accentH = pH - 150; secondaryH = pH - 30; } }
    else if (scheme === 'analogous') { if (v % 2 === 1) { accentH = pH - 35; secondaryH = pH + 25; } }
    else if (scheme === 'triadic') { if (v % 2 === 1) { accentH = pH - 120; secondaryH = pH + 120; } }
    const jitterTable = [0, -6, 6, -4, 4, -8, 8];
    const jitter = jitterTable[v % jitterTable.length];
    accentH += jitter; secondaryH -= jitter / 2;
  }

  // Theme hue biases
  const norm = (x: number) => ((x % 360) + 360) % 360;
  const warmHue = 45;
  const coolHue = 200;
  if (theme === 'earthy' || theme === 'vintage') {
    // Reduce strong warm pull to keep more hue variety
    accentH = norm(accentH * 0.8 + warmHue * 0.2);
  } else if (theme === 'neon' || theme === 'vibrant') {
    // push accent slightly further from primary for pop
    accentH = norm(accentH + 10);
  } else if (theme === 'monochrome') {
    // keep hues closer but still separated by min delta (handled below)
    accentH = norm(accentH * 0.85 + pH * 0.15);
    secondaryH = norm(secondaryH * 0.85 + pH * 0.15);
  } else if (theme === 'pastel') {
    // pastel can tolerate cooler accents
    accentH = norm(accentH * 0.8 + coolHue * 0.2);
  }

  // Enforce minimum separation and avoid overlapping
  const ensureSep = (base: number, target: number) => {
    let h = norm(target);
    if (hueDelta(base, h) < MIN_HUE_DELTA_DEG) {
      h = norm(base + (h > base ? MIN_HUE_DELTA_DEG : -MIN_HUE_DELTA_DEG));
    }
    return h;
  };
  accentH = ensureSep(pH, accentH);
  secondaryH = ensureSep(pH, secondaryH);
  if (hueDelta(accentH, secondaryH) < MIN_HUE_DELTA_DEG) {
    secondaryH = norm(accentH + MIN_HUE_DELTA_DEG);
  }

  // slight saturation diversity based on variant (used in candidate scoring)
  const sMulAdj = v % 2 === 0 ? -0.03 : 0.05;

  // Evaluate multiple candidate pairings and pick the best by heuristic score
  const favor = (x: number, center: number, width: number) => {
    const d = Math.abs(x - center);
    return Math.max(0, 1 - d / width);
  };
  type Candidate = { aH:number; sH:number; accMul:number; secMul:number };
  const cand: Candidate[] = [];
  // c1: current computed
  cand.push({ aH: accentH, sH: secondaryH, accMul: accSatMulBase, secMul: secSatMulBase });
  // c2: softened split (strong accent, analogous secondary)
  cand.push({ aH: ensureSep(pH, pH + 150), sH: ensureSep(pH, pH + 30), accMul: accSatMulBase, secMul: secSatMulBase * 0.95 });
  if (v % 2 === 1) cand.push({ aH: ensureSep(pH, pH - 150), sH: ensureSep(pH, pH - 30), accMul: accSatMulBase, secMul: secSatMulBase * 0.95 });
  // c3: triadic accent, secondary nudged back to analogous
  cand.push({ aH: ensureSep(pH, pH + 120), sH: ensureSep(pH, pH + 30), accMul: accSatMulBase, secMul: secSatMulBase });
  // c4: complementary accent (soft), secondary analogous
  cand.push({ aH: ensureSep(pH, pH + 180), sH: ensureSep(pH, pH + 30), accMul: accSatMulBase * 0.96, secMul: secSatMulBase * 0.92 });
  // c5: analogous both sides, wider gap
  cand.push({ aH: ensureSep(pH, pH + 40), sH: ensureSep(pH, pH - 25), accMul: accSatMulBase * 0.95, secMul: secSatMulBase * 0.95 });
  // c6: square-ish (90°) accent, secondary analogous
  cand.push({ aH: ensureSep(pH, pH + 90), sH: ensureSep(pH, pH + 30), accMul: accSatMulBase, secMul: secSatMulBase });

  const clashPenalty = (aH:number, sH:number) => {
    const pb = bandOf(pH); const ab = bandOf(aH); const sb = bandOf(sH);
    let pen = 0;
    // seasonal red-green traps
    if ((pb === 'green' && (ab === 'magenta' || ab === 'violet' || ab === 'pink') && (sb === 'red' || sb === 'pink')) ||
        (pb === 'red' && (ab === 'green' || ab === 'warm-green') && (sb === 'green' || sb === 'warm-green'))) {
      pen += 1.0;
    }
    return pen;
  };

  const scoreCandidate = (c: Candidate) => {
    // base separations
    const sepAcc = hueDelta(pH, c.aH);
    const sepSec = hueDelta(pH, c.sH);
    const sepAS = hueDelta(c.aH, c.sH);
    // prefer split/triadic adaptively based on primary band and lightness
    const pb2 = bandOf(pH);
    let w150 = 0.6, w120 = 0.35, w90 = 0.05;
    if (pb2 === 'warm-green' || pb2 === 'green' || pb2 === 'cyan') {
      if (pL >= 0.55) { w150 = 0.25; w120 = 0.5; w90 = 0.25; }
      else { w150 = 0.45; w120 = 0.35; w90 = 0.2; }
    }
    const accPref = w150 * favor(sepAcc, 150, 60) + w120 * favor(sepAcc, 120, 50) + w90 * favor(sepAcc, 90, 45);
    // favor secondary analogous around 30°
    const secPref = favor(sepSec, 30, 22);
    // avoid accent/secondary being too close or dead-opposite
    const asPref = 0.5 * favor(sepAS, 90, 70) + 0.5 * (1 - favor(sepAS, 180, 25));

    // build hex for s/l checks
    const accHex = build(c.aH, c.accMul + (sMulAdj), lAccentOverride ?? lAccent);
    const secHex = build(c.sH, Math.max(0.75, c.secMul + sMulAdj * 0.4), lSecondaryOverride ?? lSecondary);
    const accHsl = hexToHsl(accHex)!;
    const secHsl = hexToHsl(secHex)!;

    // saturation balance: penalize both being too high
    let satPen = 0;
    if (accHsl.s > 0.85 && secHsl.s > 0.75) satPen += 0.6;
    if (accHsl.s > 0.9 || secHsl.s > 0.9) satPen += 0.4;

    // lightness targets
    const lTarget = (l:number, lo:number, hi:number) => (l >= lo && l <= hi) ? 1 : favor(l, (lo+hi)/2, (hi-lo)/2);
    const lAccPref = lTarget(accHsl.l, 0.48, 0.62);
    const lSecPref = lTarget(secHsl.l, 0.5, 0.68);

    // penalize double complementary unless theme demands
    let compPen = 0;
    if (Math.abs(hueDelta(c.aH, pH) - 180) < 18 && (theme !== 'neon' && theme !== 'vibrant')) compPen += 0.4;

    const clashPen = clashPenalty(c.aH, c.sH);

    // Final score
    let score = 0;
    score += 2.0 * accPref + 1.6 * secPref + 1.0 * asPref;
    score += 0.6 * lAccPref + 0.5 * lSecPref;
    score -= satPen + compPen + clashPen;
    return { score, accHex, secHex };
  };

  // pick best candidate
  let best = scoreCandidate(cand[0]);
  for (let i = 1; i < cand.length; i++) {
    const s = scoreCandidate(cand[i]);
    if (s.score > best.score) best = s;
  }

  let accentHex = ensureContrast(best.accHex, bgNorm);
  let secondaryHex = ensureContrast(best.secHex, bgNorm);

  // Aesthetic clash mitigation rules
  const inRange = (h: number, a: number, b: number) => {
    const x = norm(h);
    const lo = norm(a); const hi = norm(b);
    if (lo <= hi) return x >= lo && x <= hi;
    return x >= lo || x <= hi;
  };
  const isComplementLike = (a: number, b: number) => Math.abs(hueDelta(a, b) - 180) < 20;

  const pBand = bandOf(pH);
  const aBand = bandOf(accentH);
  const sBand = bandOf(secondaryH);

  // Rule 1: Avoid seasonal red-green traps when both counter-hues are vivid
  if (pBand === 'green' && ((aBand === 'magenta' || aBand === 'violet' || aBand === 'pink') && (sBand === 'red' || sBand === 'pink'))) {
    // Pick a safe alternative accent family with variation, rather than forcing a fixed warm hue
    const altAccents = [
      ensureSep(pH, pH + 120), // triadic
      ensureSep(pH, pH + 150), // split-ish
      ensureSep(pH, pH - 120), // triadic other side
      ensureSep(pH, pH + 90),  // square-ish
    ];
    let idx = v % altAccents.length;
    // Light green primaries: bias away from warm complements
    if (pL >= 0.55) idx = (idx + 1) % altAccents.length;
    accentH = norm(altAccents[idx]);
    secondaryH = ensureSep(pH, idx % 2 === 0 ? pH + 30 : pH - 30);
  }

  // Rule 2: Allow at most one complement-like role; if both are ~complementary, make secondary analogous
  const accComp = isComplementLike(accentH, pH);
  const secComp = isComplementLike(secondaryH, pH);
  if (accComp && secComp) {
    // pick analogous side farthest from accent
    const cand1 = ensureSep(pH, pH + 30);
    const cand2 = ensureSep(pH, pH - 30);
    secondaryH = hueDelta(cand1, accentH) > hueDelta(cand2, accentH) ? cand1 : cand2;
  }

  // Rule 3: If both roles are very far (>150°) from primary, pull secondary toward analogous
  if (hueDelta(accentH, pH) > 150 && hueDelta(secondaryH, pH) > 150) {
    const side = hueDelta(pH + 30, accentH) > hueDelta(pH - 30, accentH) ? pH + 30 : pH - 30;
    secondaryH = ensureSep(pH, side);
  }

  // Industry tweaks (gentler for conservative; warmer for natural)
  const ind = (opts.industry || '').toLowerCase();
  if (['finance','bank','banking','insurance','legal','law','enterprise','b2b','health','healthcare'].some(k => ind.includes(k))) {
    // reduce saturation a bit and bring hues closer to analogous feel
    accentH = norm((accentH * 0.7) + (pH * 0.3));
    secondaryH = norm((secondaryH * 0.7) + (pH * 0.3));
  }
  if (['outdoor','outdoors','wellness','sustainability','green','agriculture'].some(k => ind.includes(k))) {
    // warm accent slightly toward 30-60° band
    const warm = 45;
    accentH = norm((accentH * 0.6) + (warm * 0.4));
  }

  // Neutrals from background with theme influence
  const bgHsl = hexToHsl(bgNorm) || { h: 210, s: 0.05, l: 0.98 };
  let nH = bgHsl.h; let nS = Math.max(0, Math.min(0.15, bgHsl.s)); let nL = bgHsl.l;
  if (theme === 'earthy' || theme === 'vintage') {
    nH = norm(nH + 10);
    nS = Math.min(0.12, Math.max(0.05, nS + 0.03));
  } else if (theme === 'pastel') {
    nS = Math.min(0.08, nS);
  } else if (theme === 'neon' || theme === 'vibrant') {
    nS = Math.min(0.15, Math.max(0.06, nS));
  } else if (theme === 'monochrome') {
    nS = 0.0;
  } else if (theme === 'muted') {
    nS = Math.min(0.1, nS);
  }
  const neutralLight = ensureContrast(hslToHex(nH, nS, Math.min(1, nL + 0.06)), bgNorm);
  const neutralDark = ensureContrast(hslToHex(nH, nS, Math.max(0, nL - 0.78)), bgNorm);

  return { accent: accentHex, secondary: secondaryHex, neutralLight, neutralDark };
}

// Derive a dark-mode set (backgroundDark, textDark, linkDark, neutralLightDark, neutralDarkDark) from primary and context
export function deriveDarkModeVariants(
  primaryHex: string,
  lightBackgroundHex: string | undefined,
  opts: { toneTraits: string[]; industry: string; variant?: number }
): { backgroundDark: string; textDark: string; linkDark: string; neutralLightDark: string; neutralDarkDark: string } {
  const p = hexToHsl(primaryHex) || { h: 220, s: 0.6, l: 0.5 };
  const theme = themeFromContext(opts.toneTraits, opts.industry);
  const v = (opts.variant ?? 0);

  const norm = (x: number) => ((x % 360) + 360) % 360;

  // Build a near-neutral, subtly tinted dark background
  let sDark = 0.05; let lDark = 0.11;
  if (theme === 'monochrome') { sDark = 0.0; lDark = 0.10; }
  else if (theme === 'pastel') { sDark = 0.03; lDark = 0.12; }
  else if (theme === 'earthy' || theme === 'vintage') { sDark = 0.06; lDark = 0.12; }
  else if (theme === 'muted') { sDark = 0.04; lDark = 0.115; }
  else if (theme === 'neon' || theme === 'vibrant') { sDark = 0.08; lDark = 0.12; }
  // small jitter to avoid banding
  if (v % 2 === 1) { lDark = Math.max(0.09, Math.min(0.13, lDark + 0.01)); }

  const backgroundDark = hslToHex(p.h, sDark, lDark);
  let textDark = bestTextOn(backgroundDark);

  // Link on dark: bump saturation, lighten a bit, slight hue offset
  const bgIsLight = (contrastRatio('#000', backgroundDark) ?? 0) > (contrastRatio('#fff', backgroundDark) ?? 0);
  let linkDark = adjustSaturation(primaryHex, 1.2);
  linkDark = bgIsLight ? adjustLightness(linkDark, -0.12) : adjustLightness(linkDark, 0.12); // should be lighten for dark bg
  linkDark = adjustHue(linkDark, -8);
  let safety = 0;
  while ((contrastRatio(linkDark, backgroundDark) ?? 0) < 4.5 && safety < 12) {
    linkDark = bgIsLight ? darken(linkDark, 0.06) : adjustLightness(linkDark, 0.06);
    safety++;
  }

  // Neutrals relative to dark background
  const bgH = hexToHsl(backgroundDark) || { h: p.h, s: sDark, l: lDark };
  let nH = bgH.h; let nS = Math.max(0, Math.min(0.12, bgH.s)); let nL = bgH.l;
  if (theme === 'earthy' || theme === 'vintage') { nH = norm(nH + 8); nS = Math.min(0.12, Math.max(0.04, nS + 0.02)); }
  else if (theme === 'pastel') { nS = Math.min(0.08, nS); }
  else if (theme === 'neon' || theme === 'vibrant') { nS = Math.min(0.14, Math.max(0.06, nS)); }
  else if (theme === 'monochrome') { nS = 0.0; }
  else if (theme === 'muted') { nS = Math.min(0.09, nS); }

  // Start with clearly separated light/dark neutrals on dark bg
  let nL_light = Math.min(0.9, Math.max(0.65, nL + 0.35));
  let nL_dark = Math.max(0.08, Math.min(nL_light - 0.28, 0.5));
  let neutralLightDark = hslToHex(nH, nS, nL_light);
  let neutralDarkDark = hslToHex(nH, nS, nL_dark);

  // Ensure neutral pair meets AA (≥ 4.5:1)
  let tries = 0;
  while (((contrastRatio(neutralDarkDark, neutralLightDark) ?? 0) < 4.5) && tries < 12) {
    nL_dark = Math.max(0.05, nL_dark - 0.04);
    neutralDarkDark = hslToHex(nH, nS, nL_dark);
    tries++;
  }

  // Ensure primary on neutralLightDark also passes AA
  const pHsl = hexToHsl(primaryHex) || { h: p.h, s: p.s, l: p.l };
  tries = 0;
  while (((contrastRatio(primaryHex, neutralLightDark) ?? 0) < 4.5) && tries < 12) {
    if (pHsl.l >= nL_light) nL_light = Math.max(0.55, nL_light - 0.04);
    else nL_light = Math.min(0.92, nL_light + 0.04);
    neutralLightDark = hslToHex(nH, nS, nL_light);
    // keep dark neutral sufficiently below light neutral
    nL_dark = Math.max(0.05, Math.min(nL_light - 0.28, nL_light - 0.18));
    neutralDarkDark = hslToHex(nH, nS, nL_dark);
    tries++;
  }

  return { backgroundDark, textDark, linkDark, neutralLightDark, neutralDarkDark };
}
