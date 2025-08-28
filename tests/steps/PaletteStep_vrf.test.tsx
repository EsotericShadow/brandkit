import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PaletteStep from '@/components/GuideGenerator/steps/PaletteStep_vrf';

vi.mock('@/components/GuideGenerator/ContrastChecks_vrf', () => ({
  default: () => <div data-testid="contrast-checks" />
}));

const suggestMock = vi.fn(async () => ({ primary: '#112233', background: '#ffffff' }));
vi.mock('@/services/aiClient_vrf', () => ({
  suggestPaletteWithRoles: () => suggestMock(),
}));

const baseInputs = { brandName: '', industry: 'Technology', mission: '', audience: '', hasExistingTagline: undefined, existingTagline: '', toneTraits: [], palette: { primary: '#010101', background: '' } };

describe('PaletteStep_vrf', () => {
  it('fills only empty roles on suggestion and renders contrast checks', async () => {
    const onGenerate = vi.fn();
    render(
      <PaletteStep
        userInputs={baseInputs as any}
        setUserInputs={(updater: any) => {
          Object.assign(baseInputs, updater(baseInputs));
        }}
        onBack={() => {}}
        onGenerate={onGenerate}
        error={null}
        setError={() => {}}
      />
    );

    // Suggest colors
    fireEvent.click(screen.getByRole('button', { name: /suggest missing colors/i }));

    await waitFor(() => {
      // background gets filled, primary remains existing value
      expect((baseInputs as any).palette.primary).toBe('#010101');
      expect((baseInputs as any).palette.background).toBe('#ffffff');
    });

    expect(screen.getByTestId('contrast-checks')).toBeInTheDocument();
  });

  it('does not overwrite existing roles; fills only missing', async () => {
    const inputs = { ...baseInputs, palette: { primary: '#ABCDEF', background: '#000000' } } as any;
    const onGenerate = vi.fn();
    render(
      <PaletteStep
        userInputs={inputs}
        setUserInputs={(updater: any) => {
          Object.assign(inputs, updater(inputs));
        }}
        onBack={() => {}}
        onGenerate={onGenerate}
        error={null}
        setError={() => {}}
      />
    );

    // Suggest colors
    fireEvent.click(screen.getByRole('button', { name: /suggest missing colors/i }));

    await waitFor(() => {
      expect(inputs.palette.primary).toBe('#ABCDEF');
      expect(inputs.palette.background).toBe('#000000');
    });
  });
});

