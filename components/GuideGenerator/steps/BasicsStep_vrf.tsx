import React from 'react';
import type { UserInputs } from '../../../types';
import Button from '../../common/Button_vrf';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onNext: () => void;
}

const BasicsStep: React.FC<Props> = ({ userInputs, setUserInputs, onNext }) => {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="brandName" className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Brand Name</label>
        <input type="text" id="brandName" name="brandName" value={userInputs.brandName} onChange={(e) => setUserInputs(p => ({...p, brandName: e.target.value}))} placeholder="e.g., Stellar Labs" className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700" />
      </div>
      <div>
        <label htmlFor="industry" className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Industry</label>
        <select id="industry" name="industry" value={userInputs.industry} onChange={(e) => setUserInputs(p => ({...p, industry: e.target.value}))} className="w-full p-2 border rounded-md dark:bg-neutral-800 dark:border-neutral-700">
          {['Technology','E-commerce','Healthcare','Finance','Education','Retail','Marketing & Advertising','Real Estate','Hospitality','Non-profit','Fashion & Apparel','Food & Beverage','Entertainment','SaaS','Consulting','Other'].map(ind => <option key={ind} value={ind}>{ind}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-1">Brand Logo (Optional)</label>
        <div className="flex items-center gap-4">
          <input type="file" id="logo" name="logo" accept="image/*" onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = () => setUserInputs(p => ({...p, logoUrl: reader.result as string }));
            reader.readAsDataURL(file);
          }} className="block w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 dark:file:bg-neutral-800 dark:file:text-neutral-200 dark:hover:file:bg-neutral-700"/>
          {userInputs.logoUrl && <img src={userInputs.logoUrl} alt="Logo preview" className="h-12 w-12 object-contain rounded-md bg-neutral-100 dark:bg-neutral-800 p-1" />}
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={onNext} disabled={!userInputs.brandName || !userInputs.industry}>Next</Button>
      </div>
    </div>
  );
};

export default BasicsStep;
