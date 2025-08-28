import React from 'react';
import PaletteStep from './GuideGenerator/steps/PaletteStep_vrf';
import type { UserInputs, BrandGuide, Palette } from '../types';

interface Props {
  onBackToGuide: () => void;
  brandGuide: BrandGuide | null;
  onApplyPalette: (palette: Palette) => void;
}

const defaultInputs: UserInputs = {
  brandName: '',
  industry: 'Technology',
  logoUrl: undefined,
  hasExistingTagline: undefined,
  existingTagline: '',
  mission: '',
  audience: '',
  toneTraits: [],
  palette: {},
};

const PaletteOnly: React.FC<Props> = ({ onBackToGuide, brandGuide, onApplyPalette }) => {
  const [inputs, setInputs] = React.useState<UserInputs>(defaultInputs);
  const [error, setError] = React.useState<string | null>(null);

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Color Palette</h2>
        <button onClick={onBackToGuide} className="text-sm underline">Back to Guide</button>
      </div>
      <PaletteStep
        userInputs={inputs}
        setUserInputs={setInputs}
        onBack={onBackToGuide}
        onGenerate={() => { if (brandGuide) { onApplyPalette(inputs.palette); onBackToGuide(); } else { onBackToGuide(); } }}
        generateLabel="Apply palette"
        error={error}
        setError={setError}
      />
    </div>
  );
};

export default PaletteOnly;

