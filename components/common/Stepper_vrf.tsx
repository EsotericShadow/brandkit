import React from 'react';

interface StepperProps {
  current: number; // 1-indexed
  steps: string[];
}

const Stepper: React.FC<StepperProps> = ({ current, steps }) => {
  return (
    <div className="flex items-center gap-2 mb-4" aria-label="palette wizard stepper">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = idx === current;
        const done = idx < current;
        return (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${
                active
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-black border-neutral-900 dark:border-white'
                  : done
                  ? 'bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700'
                  : 'bg-transparent text-neutral-500 border-neutral-300 dark:border-neutral-700'
              }`}
              aria-current={active ? 'step' : undefined}
              title={label}
            >
              {idx}
            </div>
            <span className={`text-xs ${active ? 'font-semibold' : 'text-neutral-500'}`}>{label}</span>
            {i < steps.length - 1 && <div className="w-6 h-[1px] bg-neutral-300 dark:bg-neutral-700" />}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;

