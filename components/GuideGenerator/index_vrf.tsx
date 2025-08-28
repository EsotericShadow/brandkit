import React, { useState } from 'react';
import ProgressBar from './ProgressBar_vrf';
import BasicsStep from './steps/BasicsStep_vrf';
import { TaglineStep } from './steps/TaglineStep_vrf';
import MissionStep from './steps/MissionStep_vrf';
import AudienceStep from './steps/AudienceStep_vrf';
import ToneStep from './steps/ToneStep_vrf';
import PaletteStep from './steps/PaletteStep_vrf';
import { WelcomeIcon } from './Icons_vrf';
import type { BrandGuide, UserInputs } from '../../types';
import { generateGuide } from '../../services/aiClient_vrf';

interface Props {
  onGuideGenerated: (guide: BrandGuide) => void;
  initialGuide: BrandGuide | null;
  onReset: () => void;
}

const TOTAL_STEPS = 6; // Basics, Tagline, Mission, Audience, Tone, Palette

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

const GuideGenerator: React.FC<Props> = ({ onGuideGenerated, initialGuide }) => {
  const [step, setStep] = useState<number>(0); // 0 = welcome
  const [inputs, setInputs] = useState<UserInputs>(defaultInputs);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep(s => Math.min(TOTAL_STEPS, s + 1));
  const back = () => setStep(s => Math.max(1, s - 1));

  if (initialGuide) {
    // If a guide already exists, you might want to show a message or allow reset.
  }

  if (step === 0) {
    return (
      <div className="w-full max-w-2xl mx-auto text-center animate-slide-in">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4 shadow-sm">
          <WelcomeIcon />
        </div>
        <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">Welcome to Brand Guide Generator</h2>
        <p className="text-neutral-500 dark:text-neutral-400 mt-2">Follow the steps to generate a complete brand style guide.</p>
        <button onClick={() => setStep(1)} className="mt-6 px-4 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black">Get Started</button>
      </div>
    );
  }

  const content = (
    <div className="space-y-6">
      <ProgressBar step={step} totalSteps={TOTAL_STEPS} />
      {step === 1 && <BasicsStep userInputs={inputs} setUserInputs={setInputs} onNext={next} />}
      {step === 2 && <TaglineStep userInputs={inputs} setUserInputs={setInputs} onBack={back} onNext={next} />}
      {step === 3 && <MissionStep userInputs={inputs} setUserInputs={setInputs} onBack={back} onNext={next} />}
      {step === 4 && <AudienceStep userInputs={inputs} setUserInputs={setInputs} onBack={back} onNext={next} />}
      {step === 5 && <ToneStep userInputs={inputs} setUserInputs={setInputs} onBack={back} onNext={next} />}
      {step === 6 && (
        <PaletteStep
          userInputs={inputs}
          setUserInputs={setInputs}
          onBack={back}
          onGenerate={async () => {
            setError(null);
            const guide = await generateGuide({
              brandName: inputs.brandName,
              industry: inputs.industry,
              mission: inputs.mission,
              audience: inputs.audience,
              toneTraits: inputs.toneTraits,
              palette: inputs.palette,
            } as any);
            onGuideGenerated(guide);
          }}
          error={error}
          setError={setError}
        />
      )}
    </div>
  );

  return content;
};

export default GuideGenerator;
