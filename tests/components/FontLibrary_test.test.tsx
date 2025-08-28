import React from 'react';
import { render, screen } from '@testing-library/react';
import FontLibrary from '@/components/FontLibrary_vrf';

// Minimal mock for IntersectionObserver in JSDOM
class MockIntersectionObserver {
  constructor() {}
  observe() {}
  disconnect() {}
}
(Object.assign(globalThis as any, { IntersectionObserver: MockIntersectionObserver }));

vi.mock('@/data/fonts_vrf', () => ({
  fontPairings: [
    { name: 'X + Y', heading: 'H', body: 'B', headingImport: 'h', bodyImport: 'b', traits: [], license: 'OFL', description: 'desc' },
  ],
  headingFamilyNames: () => ['Inter'],
  bodyFamilyNames: () => ['Inter'],
  assetsFor: (name: string) => ({ css: name, import: name, license: 'OFL' }),
  sourceLinksFor: () => [],
}));

vi.mock('@/components/SuggestedFonts_vrf', () => ({ default: () => <div>Suggested Fonts</div> }));

describe('FontLibrary_test', () => {
  it('asks to generate guide when brandGuide is null', () => {
    render(<FontLibrary brandGuide={null} />);
    expect(screen.getByText(/Generate a Brand Guide First/i)).toBeInTheDocument();
  });

  it('renders Font Library when brandGuide present', () => {
    const guide: any = { brandName: 'Acme', tone: { traits: [] } };
    render(<FontLibrary brandGuide={guide} />);
    expect(screen.getByText('Font Library')).toBeInTheDocument();
    expect(screen.getByText('Suggested Fonts')).toBeInTheDocument();
  });
});

