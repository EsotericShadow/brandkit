import { describe, it, expect } from 'vitest';
import { deriveExtendedRolesAesthetic, hexToHsl, correctAccentForPrimary } from '../../utils/color_vrf';
import { hueGroup } from '../../utils/color/ColorScheme';

// These tests validate that green-family primaries no longer produce violet/purple accents
// and instead prefer blue/teal for subtle/balanced vibes, and warm amber for bold vibes.

describe('Color palette generation corrections', () => {
  const primaryGreen = '#22c55e'; // Tailwind green-500
  const whiteBg = '#ffffff';

  it('balanced vibe: green primary yields warm amber/orange accent (no blue)', () => {
    const { accent } = deriveExtendedRolesAesthetic(primaryGreen, whiteBg, { toneTraits: [], industry: '' });
    const hsl = hexToHsl(accent)!;
    const group = hueGroup(hsl.h);
    expect(['orange', 'yellow']).toContain(group);
  });

  it('subtle vibe: green primary yields warm amber/orange accent (no blue)', () => {
    const { accent } = deriveExtendedRolesAesthetic(primaryGreen, whiteBg, { toneTraits: ['calm'], industry: '' });
    const hsl = hexToHsl(accent)!;
    const group = hueGroup(hsl.h);
    expect(['orange', 'yellow']).toContain(group);
  });

  it('bold vibe: green primary yields warm amber/orange accent', () => {
    const { accent } = deriveExtendedRolesAesthetic(primaryGreen, whiteBg, { toneTraits: ['bold'], industry: '' });
    const hsl = hexToHsl(accent)!;
    const group = hueGroup(hsl.h);
    expect(['orange', 'yellow']).toContain(group);
  });

  it('correction helper: fixes a violet accent suggested by LLM for a green primary', () => {
    const badViolet = '#7c3aed'; // violet
    const corrected = correctAccentForPrimary(primaryGreen, badViolet, []);
    const group = hueGroup(hexToHsl(corrected)!.h);
    expect(['orange', 'yellow']).toContain(group);
  });
});

