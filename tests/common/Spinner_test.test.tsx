import React from 'react';
import { render } from '@testing-library/react';
import Spinner from '@/components/common/Spinner_vrf';

describe('Spinner_test', () => {
  it('renders svg with size class', () => {
    const { container } = render(<Spinner size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('class') || '').toMatch(/h-12/);
  });
});

