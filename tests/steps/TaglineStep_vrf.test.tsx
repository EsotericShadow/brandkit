import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaglineStep from '@/components/GuideGenerator/steps/TaglineStep_vrf';

function Wrapper(props: any) { return <div>{props.children}</div>; }

describe('TaglineStep_vrf', () => {
  it('shows gate and advances when choosing no (needs ideas)', () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    const setUserInputs = vi.fn();
    render(
      <TaglineStep
        userInputs={{ brandName: '', industry: 'Technology', hasExistingTagline: undefined, existingTagline: '', mission: '', audience: '', toneTraits: [], palette: {} }}
        setUserInputs={setUserInputs}
        onBack={onBack}
        onNext={onNext}
      />,
      { wrapper: Wrapper }
    );
    fireEvent.click(screen.getByRole('button', { name: /no, i need ideas/i }));
    expect(onNext).toHaveBeenCalled();
  });

  it('requires existing tagline when yes is chosen', () => {
    const onNext = vi.fn();
    const onBack = vi.fn();
    const setUserInputs = vi.fn();
    render(
      <TaglineStep
        userInputs={{ brandName: '', industry: 'Technology', hasExistingTagline: true, existingTagline: '', mission: '', audience: '', toneTraits: [], palette: {} }}
        setUserInputs={setUserInputs}
        onBack={onBack}
        onNext={onNext}
      />,
      { wrapper: Wrapper }
    );
    const nextBtn = screen.getByRole('button', { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it('auto-advances when hasExistingTagline is false', () => {
    const onNext = vi.fn();
    render(
      <TaglineStep
        userInputs={{ brandName: '', industry: 'Technology', hasExistingTagline: false, existingTagline: '', mission: '', audience: '', toneTraits: [], palette: {} }}
        setUserInputs={vi.fn()}
        onBack={() => {}}
        onNext={onNext}
      />
    );
    expect(onNext).toHaveBeenCalled();
  });
});

