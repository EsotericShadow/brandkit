import { describe, it, expect } from 'vitest';
import { assetsFor, headingFamilyNames, bodyFamilyNames, googleFontsSpecimenUrl } from '@/data/fonts_vrf';

describe('data/fonts_test', () => {
  it('headingFamilyNames and bodyFamilyNames include Inter', () => {
    expect(headingFamilyNames()).toContain('Inter');
    expect(bodyFamilyNames()).toContain('Inter');
  });

  it('assetsFor returns a css stack and import url; falls back for unknown', () => {
    const known = assetsFor('Inter', 'heading');
    expect(known.css).toMatch(/Inter/);
    expect(known.import).toMatch(/@import url\(/);

    const fallback = assetsFor('NotAFont', 'body');
    expect(fallback.css).toBeTruthy();
    expect(fallback.import).toMatch(/@import url\(/);
  });

  it('googleFontsSpecimenUrl formats spaces with plus', () => {
    expect(googleFontsSpecimenUrl('Playfair Display')).toBe('https://fonts.google.com/specimen/Playfair+Display');
  });
});

