import React from 'react';
import type { Palette } from '../../types';

interface GuideLogoProps {
  logoUrl?: string;
  palette: Palette;
}

const LogoTile: React.FC<{ title: string; bg: string; children: React.ReactNode }> = ({ title, bg, children }) => (
  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
    <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">{title}</div>
    <div className="h-32 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center overflow-hidden" style={{ backgroundColor: bg }}>
      {children}
    </div>
  </div>
);

const GuideLogo: React.FC<GuideLogoProps> = ({ logoUrl, palette }) => {
  if (!logoUrl) return <p className="text-sm text-neutral-500 dark:text-neutral-400">No logo uploaded yet.</p>;
  const p: any = palette || {};
  const bgLight = p.background || '#ffffff';
  const bgPrimary = p.primary || '#171717';
  const bgNeutral = p.neutralLight || '#f5f5f5';
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <LogoTile title="On background" bg={bgLight}>
        <img src={logoUrl} alt="Brand logo on background" className="max-h-24 object-contain" />
      </LogoTile>
      <LogoTile title="On primary" bg={bgPrimary}>
        <img src={logoUrl} alt="Brand logo on primary" className="max-h-24 object-contain" />
      </LogoTile>
      <LogoTile title="On neutral" bg={bgNeutral}>
        <img src={logoUrl} alt="Brand logo on neutral" className="max-h-24 object-contain" />
      </LogoTile>
    </div>
  );
};

export default GuideLogo;

