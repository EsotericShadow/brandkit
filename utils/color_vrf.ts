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

// Import shared color theory utilities
import { MIN_HUE_DELTA_DEG, hueGroup, getThemeSettings, checkIndustryGroup } from './color/ColorScheme';
export { MIN_HUE_DELTA_DEG } from './color/ColorScheme';

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

// WCAG AA normal text contrast target
const TARGET_CONTRAST = 4.5;

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
  const theme = themeFromContext(opts.toneTraits, opts.industry);
  const v = (opts.variant ?? 0);

  // Base saturation/lightness envelopes by vibe
  let sMul = vibe === 'bold' ? 1.15 : vibe === 'subtle' ? 0.9 : 1.0;
  let lAccent = vibe === 'bold' ? Math.max(0.45, Math.min(0.58, pL + 0.00)) : vibe === 'subtle' ? Math.max(0.56, Math.min(0.66, pL + 0.06)) : Math.max(0.5, Math.min(0.62, pL + 0.04));
  let lSecondary = vibe === 'bold' ? Math.max(0.5, Math.min(0.65, pL + 0.06)) : vibe === 'subtle' ? Math.max(0.58, Math.min(0.7, pL + 0.08)) : Math.max(0.52, Math.min(0.68, pL + 0.07));

  // Theme-specific tuning via shared settings
  const themeSettings = getThemeSettings(theme);
  sMul *= themeSettings.baseSatMul;
  lAccent = Math.max(themeSettings.accLightRange[0], Math.min(themeSettings.accLightRange[1], lAccent));
  lSecondary = Math.max(themeSettings.secLightRange[0], Math.min(themeSettings.secLightRange[1], lSecondary));

  const build = (h: number, sMulLocal: number, targetL: number) => {
    const s = clamp01(Math.max(0.28, Math.min(0.85, pS * sMulLocal)));
    const l = clamp01(targetL);
    return hslToHex(h, s, l);
  };

  const norm = (x: number) => ((x % 360) + 360) % 360;

  // Brand-system mapping: analog secondary, tasteful accent by family
  const secOffset = (pH >= 60 && pH <= 200) ? -18 : 20;
  let secondaryH = norm(pH + secOffset);
  let accentH = (() => {
    const b = hueGroup(pH);
    // Green-family primaries: always warm amber/gold
    if (b === 'warm-green' || b === 'green' || b === 'cyan') {
      return vibe === 'bold' ? 32 : 38;
    }
    // Blue family: prefer magenta/fuchsia to avoid amber dominance
    if (b === 'blue') return 310; // magenta range
    // Indigo/Violet: prefer teal/cyan
    if (b === 'indigo' || b === 'violet') return 200; // teal
    // Red/Orange: teal/cyan
    if (b === 'red' || b === 'orange') return 200;
    // Yellow: blue
    if (b === 'yellow') return 220;
    // Magenta/Pink: teal to balance warmth
    if (b === 'magenta' || b === 'pink') return 200;
    // Fallback: ~120° separation
    return norm(pH + 120);
  })();

  // slight jitter for diversity
  const jitter = [0, -6, 6, -4, 4][v % 5];
  accentH = norm(accentH + jitter);
  secondaryH = norm(secondaryH - jitter / 2);

  // Enforce separations
  const ensureSep = (base: number, target: number) => {
    let h = norm(target);
    if (Math.abs(((base - h) % 360 + 360) % 360) < MIN_HUE_DELTA_DEG) {
      h = norm(base + (h > base ? MIN_HUE_DELTA_DEG : -MIN_HUE_DELTA_DEG));
    }
    return h;
  };
  accentH = ensureSep(pH, accentH);
  secondaryH = ensureSep(pH, secondaryH);
  if (Math.abs(((accentH - secondaryH) % 360 + 360) % 360) < MIN_HUE_DELTA_DEG) {
    secondaryH = norm(accentH + MIN_HUE_DELTA_DEG);
  }

  // Score a few candidates; downweight complement for subtle themes
  const subtleThemes = ['muted','vintage','earthy','monochrome','pastel'];
  const isSubtleTheme = (subtleThemes as any).includes(theme) || vibe === 'subtle';
  type Candidate = { aH:number; sH:number; accMul:number; secMul:number };
  const baseGroup = hueGroup(pH);
  const isGreenFamily = (baseGroup === 'green' || baseGroup === 'warm-green' || baseGroup === 'cyan');
  const cand: Candidate[] = isGreenFamily
    ? [
        { aH: accentH, sH: secondaryH, accMul: sMul, secMul: sMul * 0.95 }, // amber/gold only
      ]
    : [
        { aH: accentH, sH: secondaryH, accMul: sMul, secMul: sMul * 0.95 },
        { aH: ensureSep(pH, pH + 120), sH: ensureSep(pH, pH + 30), accMul: sMul, secMul: sMul * 0.95 },
        { aH: ensureSep(pH, pH + 150), sH: ensureSep(pH, pH + 30), accMul: sMul * (isSubtleTheme ? 0.9 : 1.0), secMul: sMul * 0.95 },
      ];
  const favor = (x: number, center: number, width: number) => { const d = Math.abs(x - center); return Math.max(0, 1 - d / width); };
  const hueDeltaLocal = (a: number, b: number) => { const d = Math.abs(((a - b) % 360 + 360) % 360); return d > 180 ? 360 - d : d; };
  const scoreCandidate = (c: Candidate) => {
    const sepAcc = hueDeltaLocal(pH, c.aH);
    const sepSec = hueDeltaLocal(pH, c.sH);
    const sepAS = hueDeltaLocal(c.aH, c.sH);
    // Rebalance preferences: reduce strong push to 150° (complement), especially for green-family bases.
    let w150 = isSubtleTheme ? 0.08 : 0.30;
    let w120 = isSubtleTheme ? 0.48 : 0.45;
    let w90 = isSubtleTheme ? 0.44 : 0.25;
    if (baseGroup === 'green' || baseGroup === 'warm-green' || baseGroup === 'cyan') {
      // For green-family primaries, prefer ~60–90° separation (blue/teal or warm amber)
      w150 = 0.05;
      w120 = 0.15;
      w90 = 0.80;
    }
    const accPref = w150 * favor(sepAcc, 150, 60) + w120 * favor(sepAcc, 120, 50) + w90 * favor(sepAcc, 90, 45);
    const secPref = favor(sepSec, 30, 22);
    const asPref = 0.5 * favor(sepAS, 90, 70) + 0.5 * (1 - favor(sepAS, 180, 25));
    const accHex0 = build(c.aH, c.accMul + (v % 2 === 0 ? -0.03 : 0.05), lAccent);
    const secHex0 = build(c.sH, Math.max(0.75, c.secMul + (v % 2 === 0 ? -0.02 : 0.04)), lSecondary);
    const accHsl0 = hexToHsl(accHex0)!; const secHsl0 = hexToHsl(secHex0)!;
    let satPen = 0; if (accHsl0.s > 0.85 && secHsl0.s > 0.75) satPen += 0.6; if (accHsl0.s > 0.9 || secHsl0.s > 0.9) satPen += 0.4;
    const lTarget = (l:number, lo:number, hi:number) => (l >= lo && l <= hi) ? 1 : favor(l, (lo+hi)/2, (hi-lo)/2);
    const lAccPref = lTarget(accHsl0.l, 0.48, 0.62); const lSecPref = lTarget(secHsl0.l, 0.5, 0.68);
    let compPen = 0; if (isSubtleTheme && Math.abs(hueDeltaLocal(c.aH, pH) - 180) < 18) compPen += 0.8;
    return { score: (2.2 * accPref + 1.6 * secPref + 1.0 * asPref + 0.6 * lAccPref + 0.5 * lSecPref) - (satPen + compPen), accHex: accHex0, secHex: secHex0 };
  };
  let best = scoreCandidate(cand[0]); for (let i = 1; i < cand.length; i++) { const s = scoreCandidate(cand[i]); if (s.score > best.score) best = s; }

  let accentHex = ensureContrast(best.accHex, bgNorm);
  let secondaryHex = ensureContrast(best.secHex, bgNorm);

  // Tinted neutrals based on background
  const bgHsl = hexToHsl(bgNorm) || { h: pH, s: 0.05, l: 0.98 };
  let nH = bgHsl.h; let nS = Math.max(0, Math.min(0.15, bgHsl.s)); let nL = bgHsl.l;
  if (theme === 'earthy' || theme === 'vintage') { nH = norm(nH + 10); nS = Math.min(0.12, Math.max(0.05, nS + 0.03)); }
  else if (theme === 'pastel') { nS = Math.min(0.08, nS); }
  else if (theme === 'neon' || theme === 'vibrant') { nS = Math.min(0.15, Math.max(0.06, nS)); }
  else if (theme === 'monochrome') { nS = 0.0; }
  else if (theme === 'muted') { nS = Math.min(0.1, nS); }
  // For green-family primaries, keep neutrals less tinted (more truly gray)
  if (isGreenFamily) {
    nS = Math.min(nS, 0.06);
  }
  const neutralLight = ensureContrast(hslToHex(nH, nS, Math.min(1, nL + 0.06)), bgNorm);
  const neutralDark = ensureContrast(hslToHex(nH, nS, Math.max(0, nL - 0.78)), bgNorm);

  return { accent: accentHex, secondary: secondaryHex, neutralLight, neutralDark };
}

// Derive a dark-mode set (backgroundDark, textDark, linkDark, neutralLightDark, neutralDarkDark) from primary and context
export function correctAccentForPrimary(primaryHex: string, accentHex: string, toneTraits: string[] = []): string {
  const p = hexToHsl(primaryHex);
  const a = hexToHsl(accentHex);
  if (!p || !a) return accentHex;
  const base = hueGroup(p.h);

  // Determine target accent hue family by base family
  let targetH: number | null = null;
  if (base === 'green' || base === 'warm-green' || base === 'cyan') {
    targetH = 36; // amber/gold for green-family
  } else if (base === 'blue') {
    targetH = 310; // magenta/fuchsia against blue
  } else if (base === 'indigo' || base === 'violet') {
    targetH = 200; // teal/cyan
  } else if (base === 'red' || base === 'orange') {
    targetH = 200; // teal/cyan
  } else if (base === 'yellow') {
    targetH = 220; // blue
  } else if (base === 'magenta' || base === 'pink') {
    targetH = 200; // teal/cyan
  }

  if (targetH == null) return accentHex;

  // Always coerce for green-family, otherwise only coerce if far from target
  const delta = Math.abs(((a.h - targetH) % 360 + 360) % 360);
  const hueDist = delta > 180 ? 360 - delta : delta;
  const shouldCoerce = (base === 'green' || base === 'warm-green' || base === 'cyan') || hueDist > 35;
  if (!shouldCoerce) return accentHex;
  const s = Math.max(0.5, Math.min(0.85, a.s));
  const l = Math.max(0.48, Math.min(0.64, a.l));
  return hslToHex(targetH, s, l);
}

export function isGreenOrBlueFamily(hex: string): boolean {
  const h = hexToHsl(hex);
  if (!h) return false;
  const g = hueGroup(h.h);
  return g === 'green' || g === 'warm-green' || g === 'cyan' || g === 'blue';
}

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
