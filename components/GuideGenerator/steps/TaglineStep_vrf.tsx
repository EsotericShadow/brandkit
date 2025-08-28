import React, { useEffect } from 'react';
import Button from '../../common/Button_vrf';
import WizardStepWrapper from '../WizardStepWrapper_vrf';
import { TaglineIcon } from '../Icons_vrf';
import type { UserInputs } from '../../../types';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onBack: () => void;
  onNext: () => void;
}

const TaglineStep: React.FC<Props> = ({ userInputs, setUserInputs, onBack, onNext }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target as any;
    setUserInputs(prev => ({ ...prev, [name]: value }));
  };

  // If the user previously chose "No, I need ideas", auto-advance when returning to this step
  useEffect(() => {
    if (userInputs.hasExistingTagline === false) {
      onNext();
    }
  }, [userInputs.hasExistingTagline]);

  return (
    <WizardStepWrapper icon={<TaglineIcon/>} title="What about a tagline?" description="A great tagline captures the essence of your brand in a single phrase.">
      {userInputs.hasExistingTagline === undefined && (
        <div className="text-center">
          <p className="mb-4 text-neutral-600 dark:text-neutral-300">Do you already have a tagline or slogan?</p>
          <div className="flex justify-center gap-4">
            <Button onClick={() => setUserInputs(prev => ({...prev, hasExistingTagline: true}))} variant="secondary" size="lg">Yes, I have one</Button>
            <Button onClick={() => { setUserInputs(prev => ({...prev, hasExistingTagline: false, existingTagline: ''})); onNext(); }} size="lg">No, I need ideas</Button>
          </div>
        </div>
      )}
      {userInputs.hasExistingTagline === true && (
        <div>
          <label htmlFor="existingTagline" className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Your existing tagline</label>
          <textarea
            name="existingTagline"
            id="existingTagline"
            className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700"
            rows={2}
            placeholder="e.g., Design, faster."
            value={userInputs.existingTagline}
            onChange={handleInputChange}
          />
          <div className="flex justify-between gap-2 mt-4">
            <Button onClick={onBack} variant="secondary">Back</Button>
            <Button onClick={onNext} disabled={!userInputs.existingTagline}>Next</Button>
          </div>
        </div>
      )}
    </WizardStepWrapper>
  );
};

export default TaglineStep;
export { TaglineStep };

