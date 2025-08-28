import React from 'react';
import { render, screen } from '@testing-library/react';
import AudienceStep from '@/components/GuideGenerator/steps/AudienceStep_vrf';

describe('AudienceStep_vrf', () => {
  it('disables Next until audience is non-empty', () => {
    const onNext = vi.fn();
    render(
      <AudienceStep
        userInputs={{ brandName: '', industry: 'Technology', mission: '', audience: '', hasExistingTagline: undefined, existingTagline: '', toneTraits: [], palette: {} }}
        setUserInputs={vi.fn()}
        onBack={() => {}}
        onNext={onNext}
      />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

