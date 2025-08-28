import React from 'react';
import { render, screen } from '@testing-library/react';
import WizardStepWrapper from '@/components/GuideGenerator/WizardStepWrapper_vrf';

describe('WizardStepWrapper_vrf', () => {
  it('renders icon, title, description and children', () => {
    const icon = <div data-testid="icon">I</div>;
    render(
      <WizardStepWrapper icon={icon} title="Step Title" description="Step description">
        <div>Child content</div>
      </WizardStepWrapper>
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('Step Title')).toBeInTheDocument();
    expect(screen.getByText('Step description')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });
});

