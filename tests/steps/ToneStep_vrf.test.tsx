import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ToneStep from '@/components/GuideGenerator/steps/ToneStep_vrf';
import * as Constants from '@/constants';

vi.mock('@/constants', () => ({ TONE_TRAITS: ['Friendly', 'Professional'] }));

describe('ToneStep_vrf', () => {
  it('disables Next until at least one trait is selected, then enables after toggle', () => {
    const onNext = vi.fn();
    const { rerender } = render(
      <ToneStep
        userInputs={{ brandName: '', industry: 'Technology', mission: '', audience: '', hasExistingTagline: undefined, existingTagline: '', toneTraits: [], palette: {} }}
        setUserInputs={(updater: any) => {
          const next = updater({ brandName: '', industry: 'Technology', mission: '', audience: '', hasExistingTagline: undefined, existingTagline: '', toneTraits: [], palette: {} });
          rerender(<ToneStep userInputs={next} setUserInputs={() => {}} onBack={() => {}} onNext={onNext} />);
        }}
        onBack={() => {}}
        onNext={onNext}
      />
    );

    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /friendly/i }));

    // After selecting a trait, Next should be enabled in the rerender
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });
});

