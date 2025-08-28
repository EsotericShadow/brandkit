import React from 'react';
import { render } from '@testing-library/react';
import { WelcomeIcon, BasicsIcon, TaglineIcon, MissionIcon, AudienceIcon, ToneIcon, PaletteIcon } from '@/components/GuideGenerator/Icons_vrf';

describe('Icons_test', () => {
  it('renders all icons without crashing', () => {
    render(<div>
      <WelcomeIcon />
      <BasicsIcon />
      <TaglineIcon />
      <MissionIcon />
      <AudienceIcon />
      <ToneIcon />
      <PaletteIcon />
    </div>);
  });
});

