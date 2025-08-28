import React from 'react';
import { render } from '@testing-library/react';
import ProgressBar from '@/components/GuideGenerator/ProgressBar_vrf';

describe('ProgressBar_vrf', () => {
  it('computes width as step/totalSteps * 100%', () => {
    const { container } = render(<ProgressBar step={3} totalSteps={6} />);
    const bar = Array.from(container.querySelectorAll('div')).find(el => (el as HTMLElement).style.width !== '') as HTMLElement | undefined;
    expect(bar).toBeTruthy();
    expect((bar as HTMLElement).style.width).toBe('50%');
  });
});

