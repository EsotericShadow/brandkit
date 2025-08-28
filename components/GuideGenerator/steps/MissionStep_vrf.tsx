import React from 'react';
import Button from '../../common/Button_vrf';
import WizardStepWrapper from '../WizardStepWrapper_vrf';
import { MissionIcon } from '../Icons_vrf';
import type { UserInputs } from '../../../types';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onBack: () => void;
  onNext: () => void;
}

const MissionStep: React.FC<Props> = ({ userInputs, setUserInputs, onBack, onNext }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUserInputs(prev => ({ ...prev, mission: e.target.value }));
  };
  return (
    <WizardStepWrapper icon={<MissionIcon/>} title="What's your mission?" description={`What is the core purpose of ${userInputs.brandName || 'your brand'}? Think about the value you bring to your customers.`}>
      <textarea
        name="mission"
        className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700"
        rows={5}
        placeholder="e.g., To empower creative professionals with intuitive design tools."
        value={userInputs.mission}
        onChange={handleInputChange}
      />
      <div className="flex justify-between gap-2 mt-4">
        <Button onClick={onBack} variant="secondary">Back</Button>
        <Button onClick={onNext} disabled={!userInputs.mission}>Next</Button>
      </div>
    </WizardStepWrapper>
  );
};

export default MissionStep;

