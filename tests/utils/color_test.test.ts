import { describe, it, expect } from 'vitest';
import { parseColor, contrastRatio, assessContrast } from '@/utils/color_vrf';

describe('utils/color_test', () => {
  it('parseColor supports #RGB and #RRGGBB and rgb()', () => {
    expect(parseColor('#fff')).toEqual([255, 255, 255]);
    expect(parseColor('#000')).toEqual([0, 0, 0]);
    expect(parseColor('#112233')).toEqual([17, 34, 51]);
    expect(parseColor('rgb(10, 20, 30)')).toEqual([10, 20, 30]);
  });

  it('parseColor returns null for invalid inputs', () => {
    expect(parseColor('#12')).toBeNull();
    expect(parseColor('#GGGGGG')).toBeNull();
    expect(parseColor('not-a-color')).toBeNull();
  });

  it('contrastRatio matches WCAG reference examples', () => {
    // Black on white = 21:1
    expect(contrastRatio('#000000', '#ffffff')?.toFixed(2)).toBe('21.00');
    // Same colors = 1:1
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1.0, 5);
  });

  it('assessContrast flags thresholds correctly', () => {
    const hi = assessContrast('#000', '#fff');
    expect(hi.AA).toBe(true);
    expect(hi.AAA).toBe(true);
    expect(hi.AALarge).toBe(true);
    expect(hi.AAALarge).toBe(true);

    const low = assessContrast('#777777', '#7a7a7a');
    expect(low.AA).toBe(false);
    expect(low.AAA).toBe(false);
  });
});

