import React from 'react';
import Button from '../../common/Button_vrf';
import WizardStepWrapper from '../WizardStepWrapper_vrf';
import { AudienceIcon } from '../Icons_vrf';
import type { UserInputs } from '../../../types';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onBack: () => void;
  onNext: () => void;
}

const AudienceStep: React.FC<Props> = ({ userInputs, setUserInputs, onBack, onNext }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInputs(prev => ({ ...prev, audience: e.target.value }));
  };
  return (
    <WizardStepWrapper icon={<AudienceIcon/>} title="Who are you talking to?" description="Describe your ideal customer. What are their goals, needs, and motivations?">
      <textarea
        name="audience"
        className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700"
        rows={5}
        placeholder="e.g., Freelance graphic designers and small agency owners aged 25-40."
        value={userInputs.audience}
        onChange={handleInputChange}
      />
      <div className="flex justify-between gap-2 mt-4">
        <Button onClick={onBack} variant="secondary">Back</Button>
        <Button onClick={onNext} disabled={!userInputs.audience}>Next</Button>
      </div>
    </WizardStepWrapper>
  );
};

export default AudienceStep;

