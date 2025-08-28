import React from 'react';
import { AppView } from '../types';

interface Props {
  activeView: AppView;
  setView: (v: AppView) => void;
  isGuideGenerated: boolean;
}

const Btn: React.FC<{ active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, disabled, onClick, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      active ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    {children}
  </button>
);

const Sidebar: React.FC<Props> = ({ activeView, setView, isGuideGenerated }) => {
  return (
    <aside className="w-full md:w-64 md:h-screen md:sticky md:top-0 p-4 border-b md:border-b-0 md:border-r border-neutral-200 dark:border-neutral-800">
      <nav className="space-y-2">
        <Btn active={activeView === AppView.GUIDE_GENERATOR} onClick={() => setView(AppView.GUIDE_GENERATOR)}>Guide Generator</Btn>
        <Btn active={activeView === AppView.PALETTE_GENERATOR} onClick={() => setView(AppView.PALETTE_GENERATOR)}>Palette Generator</Btn>
        <Btn active={activeView === AppView.VOICE_REWRITER} onClick={() => setView(AppView.VOICE_REWRITER)} disabled={!isGuideGenerated}>Voice Rewriter</Btn>
        <Btn active={activeView === AppView.FONT_LIBRARY} onClick={() => setView(AppView.FONT_LIBRARY)} disabled={!isGuideGenerated}>Font Library</Btn>
      </nav>
    </aside>
  );
};

export default Sidebar;
