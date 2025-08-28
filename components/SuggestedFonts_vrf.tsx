import React from 'react';
import Card from './common/Card_vrf';
import type { BrandGuide } from '../types';
import { suggestPairings, googleFontsSpecimenUrl } from '../data/fonts_vrf';

interface Props {
  brandGuide: BrandGuide;
  max?: number;
  mode?: 'light' | 'dark';
  onAdd?: (p: { name: string; heading: string; body: string }) => void;
  onRemove?: (p: { name: string; heading: string; body: string }) => void;
}

const SuggestedFonts: React.FC<Props> = ({ brandGuide, max = 6, mode = 'light', onAdd, onRemove }) => {
  const picks = suggestPairings(brandGuide, max);
  const palette: any = brandGuide?.palette || {};
  const isDark = mode === 'dark';
  const textColor = (isDark ? (palette.textDark || '#f5f5f5') : (palette.text || palette.neutralDark || '#111111'));
  const bgColor = (isDark ? (palette.backgroundDark || '#0b0b0b') : (palette.background || palette.neutralLight || '#ffffff'));
  const borderColor = palette.primary || palette.accent || palette.neutralDark || '#999999';
  const linkColor = (isDark ? (palette.linkDark || palette.primary || palette.accent || '#60a5fa') : (palette.link || palette.primary || palette.accent || '#2563eb'));

  return (
    <Card title="Suggested Fonts" description="Based on your brand's tone and industry">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {picks.map((p) => {
          const inGuide = !!(brandGuide.fontPairings || []).some(x => x.heading === p.heading && x.body === p.body);
          return (
          <div key={p.name} className="rounded-md border shadow-sm p-4 md:p-5" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>
            <style>
              {p.headingImport}
              {p.bodyImport}
            </style>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold" style={{ color: textColor }}>{p.name}</h4>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: borderColor + '20', color: textColor }}>{p.license}</span>
            </div>
            <p style={{ fontFamily: p.heading, color: textColor, fontWeight: 800 }} className="mt-2 text-xl">Heading Sample</p>
            <p style={{ fontFamily: p.body, color: textColor }} className="text-sm">Body sample: The quick brown fox jumps over the lazy dog.</p>
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <a href={googleFontsSpecimenUrl(p.heading.replace(/[\"']/g,'').split(',')[0])} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: linkColor }}>Heading font</a>
              <a href={googleFontsSpecimenUrl(p.body.replace(/[\"']/g,'').split(',')[0])} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: linkColor }}>Body font</a>
              <button onClick={() => navigator.clipboard.writeText(`${p.headingImport}\n${p.bodyImport}\n/* CSS usage */\nbody { font-family: ${p.body}; }\nh1,h2,h3 { font-family: ${p.heading}; }`)} className="text-xs underline font-medium" style={{ color: linkColor }}>Copy web CSS</button>
              {inGuide && onRemove ? (
                <button onClick={() => onRemove({ name: p.name, heading: p.heading, body: p.body })} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 text-white">Remove from Guide</button>
              ) : (onAdd ? (
                <button onClick={() => onAdd({ name: p.name, heading: p.heading, body: p.body })} className="px-3 py-1 rounded-md text-xs font-semibold" style={{ backgroundColor: linkColor, color: '#fff' }}>Add to Guide</button>
              ) : null)}
            </div>
          </div>
        );
        })}
      </div>
    </Card>
  );
};

export default SuggestedFonts;

