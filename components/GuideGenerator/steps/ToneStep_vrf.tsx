import React from 'react';
import Button from '../../common/Button_vrf';
import WizardStepWrapper from '../WizardStepWrapper_vrf';
import { ToneIcon } from '../Icons_vrf';
import { TONE_TRAITS } from '../../../constants';
import type { UserInputs } from '../../../types';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onBack: () => void;
  onNext: () => void;
}

const ToneStep: React.FC<Props> = ({ userInputs, setUserInputs, onBack, onNext }) => {
  const toggleTrait = (trait: string) => {
    setUserInputs(prev => {
      const newTraits = prev.toneTraits.includes(trait)
        ? prev.toneTraits.filter(t => t !== trait)
        : [...prev.toneTraits, trait];
      return { ...prev, toneTraits: newTraits };
    });
  };
  return (
    <WizardStepWrapper icon={<ToneIcon/>} title="How do you want to sound?" description="Select the traits that best describe your brand's personality.">
      <div className="flex flex-wrap gap-2 mb-4">
        {TONE_TRAITS.map(trait => (
          <button
            key={trait}
            onClick={() => toggleTrait(trait)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${userInputs.toneTraits.includes(trait) ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}
          >
            {trait}
          </button>
        ))}
      </div>
      <div className="flex justify-between gap-2 mt-6">
        <Button onClick={onBack} variant="secondary">Back</Button>
        <Button onClick={onNext} disabled={userInputs.toneTraits.length === 0}>Next</Button>
      </div>
    </WizardStepWrapper>
  );
};

export default ToneStep;

