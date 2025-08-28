import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MissionStep from '@/components/GuideGenerator/steps/MissionStep_vrf';

describe('MissionStep_vrf', () => {
  it('disables Next until mission is non-empty', () => {
    const onNext = vi.fn();
    render(
      <MissionStep
        userInputs={{ brandName: '', industry: 'Technology', mission: '', audience: '', hasExistingTagline: undefined, existingTagline: '', toneTraits: [], palette: {} }}
        setUserInputs={vi.fn()}
        onBack={() => {}}
        onNext={onNext}
      />
    );
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});

