import React, { createContext, useContext, useMemo, useRef, useState } from 'react';

export type Toast = { id: string; message: string };

type ToastContextValue = {
  showToast: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Record<string, any>>({});

  const showToast = (message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    const t = setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
      delete timers.current[id];
    }, 2500);
    timers.current[id] = t;
  };

  const value = useMemo(() => ({ showToast }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className="px-4 py-2 rounded-md shadow-lg bg-neutral-900 text-white dark:bg-white dark:text-black border border-neutral-800 dark:border-neutral-200">
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

