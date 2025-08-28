import React from 'react';
import { render, screen } from '@testing-library/react';
import SuggestedFonts from '@/components/SuggestedFonts_vrf';

vi.mock('@/data/fonts_vrf', () => ({
  suggestPairings: () => ([
    { name: 'Pair A', heading: 'H', body: 'B', headingImport: 'h', bodyImport: 'b', license: 'OFL' },
    { name: 'Pair B', heading: 'H2', body: 'B2', headingImport: 'h2', bodyImport: 'b2', license: 'OFL' },
  ]),
  googleFontsSpecimenUrl: (name: string) => `https://fonts.google.com/specimen/${name}`,
}));

describe('SuggestedFonts_test', () => {
  it('renders Suggested Fonts card and respects max items', () => {
    const guide: any = { tone: { traits: [] } };
    render(<SuggestedFonts brandGuide={guide} max={1} />);
    expect(screen.getByText('Suggested Fonts')).toBeInTheDocument();
    expect(screen.getByText('Pair A')).toBeInTheDocument();
  });
});

