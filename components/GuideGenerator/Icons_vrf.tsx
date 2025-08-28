import React from 'react';

const icon = (path: React.ReactNode) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-neutral-700 dark:text-neutral-300">{path}</svg>
);

export const WelcomeIcon: React.FC = () => icon(<circle cx="12" cy="12" r="10" />);
export const BasicsIcon: React.FC = () => icon(<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h10v2H4z" />);
export const TaglineIcon: React.FC = () => icon(<path d="M5 7h14v3H5zM5 12h10v3H5z" />);
export const MissionIcon: React.FC = () => icon(<path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />);
export const AudienceIcon: React.FC = () => icon(<path d="M12 12a5 5 0 100-10 5 5 0 000 10zm-7 9a7 7 0 0114 0H5z" />);
export const ToneIcon: React.FC = () => icon(<path d="M3 12h18M12 3v18" />);
export const PaletteIcon: React.FC = () => icon(<path d="M12 3a9 9 0 100 18c.9 0 1.5-.6 1.5-1.5S12.9 18 12 18c-2.8 0-5-2.2-5-5s2.2-5 5-5c1.5 0 3 .6 4 1.6.6.6 1 1.3 1 2.1 0 1-.6 1.6-1.5 1.6-.8 0-1.5-.7-1.5-1.5" />);
