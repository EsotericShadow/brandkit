import { describe, it, expect } from 'vitest';
import { parseColor, contrastRatio, assessContrast, bestTextOn, lighten, darken } from './color_vrf';

describe('color_vrf basics', () => {
  it('parses hex and rgb correctly', () => {
    expect(parseColor('#000')).toEqual([0,0,0]);
    expect(parseColor('#FFFFFF')).toEqual([255,255,255]);
    expect(parseColor('rgb(0, 128, 255)')).toEqual([0,128,255]);
    expect(parseColor('invalid')).toBeNull();
  });

  it('computes contrast ratio and assessments', () => {
    const r = contrastRatio('#000000', '#FFFFFF');
    expect(r).toBeGreaterThan(20);
    const a = assessContrast('#000000', '#FFFFFF');
    expect(a.AA).toBe(true);
    expect(a.AAA).toBe(true);
  });

  it('bestTextOn chooses black on light bg and white on dark bg', () => {
    expect(bestTextOn('#ffffff')).toBe('#000000');
    expect(bestTextOn('#000000')).toBe('#ffffff');
  });

  it('lighten moves toward white and darken toward black (contrast decreases vs target)', () => {
    const base = '#3366cc';
    // Lighten should reduce contrast against white
    expect(contrastRatio(lighten(base, 0.5), '#ffffff')).toBeLessThan(contrastRatio(base, '#ffffff')!);
    // Darken should reduce contrast against black
    expect(contrastRatio(darken(base, 0.5), '#000000')).toBeLessThan(contrastRatio(base, '#000000')!);
  });
});

