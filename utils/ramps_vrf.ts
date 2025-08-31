import { hexToHsl, hslToHex } from './color_vrf';

export function buildRamp(hex: string, steps = 5): string[] {
  const hsl = hexToHsl(hex);
  if (!hsl) return [hex];
  const { h, s, l } = hsl;
  // Lightness targets around base l; clamp between 0.02 and 0.96
  const targets = [
    Math.min(0.96, l + 0.34),
    Math.min(0.90, l + 0.18),
    l,
    Math.max(0.10, l - 0.12),
    Math.max(0.04, l - 0.24),
  ];
  const out: string[] = [];
  for (let i = 0; i < Math.min(steps, targets.length); i++) {
    out.push(hslToHex(h, Math.max(0, Math.min(1, s)), Math.max(0, Math.min(1, targets[i]))));
  }
  return out;
}

export function rampLabels(): string[] {
  return ['50','300','500','700','900'];
}

