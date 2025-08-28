import React from 'react';

const ProgressBar: React.FC<{ step: number; totalSteps: number }> = ({ step, totalSteps }) => (
  <div className="w-full max-w-md mx-auto bg-neutral-200 dark:bg-neutral-800 rounded-full h-2 my-8">
    <div className="bg-neutral-900 dark:bg-neutral-100 h-2 rounded-full transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }} />
  </div>
);

export default ProgressBar;

