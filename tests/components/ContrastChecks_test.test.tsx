import React from 'react';
import { render, screen } from '@testing-library/react';
import ContrastChecks from '@/components/GuideGenerator/ContrastChecks_vrf';

vi.mock('@/utils/color_vrf', async () => {
  const actual: any = await vi.importActual<any>('@/utils/color_vrf');
  return {
    ...actual,
    assessContrast: () => ({ ratio: 5, AA: true, AAA: false, AALarge: true, AAALarge: false }),
  } as any;
});

describe('ContrastChecks_test', () => {
  it('renders rows for provided palette', () => {
    render(<ContrastChecks palette={{ text: '#000', background: '#fff', primary: '#00f' }} />);
    expect(screen.getByText(/Text on background/i)).toBeInTheDocument();
  });
});

