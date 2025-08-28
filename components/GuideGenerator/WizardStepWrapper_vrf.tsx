import React from 'react';
import Card from '../common/Card_vrf';

const WizardStepWrapper: React.FC<{icon: React.ReactNode, title: string, description: string, children: React.ReactNode}> = ({icon, title, description, children}) => (
  <div className="w-full max-w-2xl mx-auto animate-slide-in">
    <div className="text-center mb-8">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>
      <h2 className="text-3xl font-bold text-neutral-900 dark:text-white">{title}</h2>
      <p className="text-neutral-500 dark:text-neutral-400 mt-2">{description}</p>
    </div>
    <Card>{children}</Card>
  </div>
);

export default WizardStepWrapper;

