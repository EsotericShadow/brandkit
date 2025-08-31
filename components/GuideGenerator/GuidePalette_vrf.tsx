import React from 'react';
import ColorSwatch from './ColorSwatch_vrf';
import type { Palette } from '../../types';
import { contrastRatio, bestTextOn } from '../../utils/color_vrf';
import { buildRamp } from '../../utils/ramps_vrf';

interface GuidePaletteProps {
  palette: Palette;
  isEditing: boolean;
  onChange: (name: keyof Palette, hex: string) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="h-[1px] bg-neutral-300 dark:bg-neutral-700 flex-1" />
      <h4 className="text-[11px] tracking-widest uppercase text-neutral-600 dark:text-neutral-400">{title}</h4>
      <div className="h-[1px] bg-neutral-300 dark:bg-neutral-700 flex-1" />
    </div>
    {children}
  </div>
);

const Badge: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center rounded-full bg-neutral-200/70 dark:bg-neutral-800/70 px-2 py-0.5 text-[10px] font-medium text-neutral-700 dark:text-neutral-300 border border-neutral-300 dark:border-neutral-700">{children}</span>
);

const Block: React.FC<{ label: string; hex?: string; size?: 'lg'|'md' } & React.HTMLAttributes<HTMLDivElement>> = ({ label, hex, size='md', ...rest }) => (
  <div className="flex flex-col items-start gap-1">
    <div className={`rounded-lg border border-neutral-200 dark:border-neutral-800 ${size==='lg' ? 'h-28 w-full' : 'h-16 w-full'}`} style={{ backgroundColor: hex || '#000000' }} {...rest} />
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{label}</span>
      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase font-mono">{hex || '—'}</span>
    </div>
  </div>
);

const GuidePalette: React.FC<GuidePaletteProps> = ({ palette, isEditing, onChange }) => {
  const p: any = palette || {};
  const onPrimary = p.onPrimary || (p.primary ? bestTextOn(p.primary) : '#ffffff');

  const txtOnBg = p.text && p.background ? (contrastRatio(p.text, p.background) ?? 0) : null;
  const lnkOnBg = p.link && p.background ? (contrastRatio(p.link, p.background) ?? 0) : null;
  const neuRatio = p.neutralLight && p.neutralDark ? (contrastRatio(p.neutralDark, p.neutralLight) ?? 0) : null;

  // Additional roles (non-standard keys)
  const known = new Set(['primary','secondary','accent','background','text','link','neutralLight','neutralDark','onPrimary']);
  const extras = Object.keys(palette || {}).filter(k => !known.has(k));

  // Helper to build token exports
  const tokens = React.useMemo(() => {
    const kv: Record<string, string> = {};
    if (p.primary) kv['--brand-primary'] = p.primary;
    if (onPrimary) kv['--brand-on-primary'] = onPrimary;
    if (p.background) kv['--brand-background'] = p.background;
    if (p.text) kv['--brand-text'] = p.text;
    if (p.link) kv['--brand-link'] = p.link;
    if (p.accent) kv['--brand-accent'] = p.accent;
    if (p.secondary) kv['--brand-secondary'] = p.secondary;
    if (p.neutralLight) kv['--brand-neutral-light'] = p.neutralLight;
    if (p.neutralDark) kv['--brand-neutral-dark'] = p.neutralDark;
    return kv;
  }, [p.primary, onPrimary, p.background, p.text, p.link, p.accent, p.secondary, p.neutralLight, p.neutralDark]);

  const cssVarExport = React.useMemo(() => {
    const lines = Object.entries(tokens).map(([k,v]) => `  ${k}: ${v};`);
    return `:root{\n${lines.join('\n')}\n}`;
  }, [tokens]);

  const tailwindExport = React.useMemo(() => {
    const brand: Record<string, any> = {};
    if (p.primary) brand.primary = p.primary;
    if (onPrimary) brand.onPrimary = onPrimary;
    if (p.background) brand.background = p.background;
    if (p.text) brand.text = p.text;
    if (p.link) brand.link = p.link;
    if (p.accent) brand.accent = p.accent;
    if (p.secondary) brand.secondary = p.secondary;
    if (p.neutralLight || p.neutralDark) brand.neutral = { ...(p.neutralLight ? { light: p.neutralLight } : {}), ...(p.neutralDark ? { dark: p.neutralDark } : {}) };
    return `module.exports = {\n  theme: {\n    extend: {\n      colors: {\n        brand: ${JSON.stringify(brand, null, 10).replace(/"/g, '\"')}\n      }\n    }\n  }\n}`;
  }, [p.primary, onPrimary, p.background, p.text, p.link, p.accent, p.secondary, p.neutralLight, p.neutralDark]);

  const styleDictionaryExport = React.useMemo(() => {
    const sd: any = { color: { brand: {} } };
    if (p.primary) sd.color.brand.primary = { value: p.primary };
    if (onPrimary) sd.color.brand.onPrimary = { value: onPrimary };
    if (p.background) sd.color.brand.background = { value: p.background };
    if (p.text) sd.color.brand.text = { value: p.text };
    if (p.link) sd.color.brand.link = { value: p.link };
    if (p.accent) sd.color.brand.accent = { value: p.accent };
    if (p.secondary) sd.color.brand.secondary = { value: p.secondary };
    if (p.neutralLight) sd.color.brand.neutralLight = { value: p.neutralLight };
    if (p.neutralDark) sd.color.brand.neutralDark = { value: p.neutralDark };
    return JSON.stringify(sd, null, 2);
  }, [p.primary, onPrimary, p.background, p.text, p.link, p.accent, p.secondary, p.neutralLight, p.neutralDark]);

  const copy = (txt: string) => navigator.clipboard.writeText(txt);

  const [showAdvanced, setShowAdvanced] = React.useState(false);

  return (
    <div className="space-y-8">
      {/* Brand colors */}
      <Section title="Brand colors">
        <div className="text-xs text-neutral-500 dark:text-neutral-400 -mt-1">Use Primary for calls to action, Accent for highlights, and Secondary for supporting UI.</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary hero */}
          <div className="md:col-span-2">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
              <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Primary</div>
              <div className="h-28 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center" style={{ backgroundColor: p.primary || '#000000' }}>
                <span className="text-2xl font-extrabold" style={{ color: onPrimary }}>Aa</span>
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button type="button" onClick={()=>copy(p.primary || '')} title="Copy hex"><Badge>{p.primary || '—'}</Badge></button>
                <Badge>On: {onPrimary}</Badge>
              </div>
            </div>
          </div>
          {/* Secondary & Accent */}
          <div className="space-y-6">
            {(['secondary','accent'] as const).map((k) => (
              p[k] ? (
                <div key={k} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
                  <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">{k.charAt(0).toUpperCase() + k.slice(1)}</div>
                  <div className="h-14 rounded-lg border border-neutral-200 dark:border-neutral-800" style={{ backgroundColor: p[k] }} />
                  <div className="mt-2 flex items-center gap-3">
                    <button type="button" onClick={()=>copy(p[k] as string)} title="Copy hex"><Badge>{p[k]}</Badge></button>
                    {isEditing && (
                      <button className="text-[11px] underline text-neutral-600 dark:text-neutral-300" onClick={() => {
                        const next = prompt(`Set ${k} (#RRGGBB)`, p[k]);
                        if (next) onChange(k, next);
                      }}>Edit</button>
                    )}
                  </div>
                </div>
              ) : null
            ))}
          </div>
        </div>
      </Section>

      {/* Tonal ramps */}
      {(p.primary || p.accent) && (
        <Section title="Tonal ramps">
          <div className="text-xs text-neutral-500 dark:text-neutral-400 -mt-2 mb-2">Use tints and shades for states and backgrounds. Click any swatch to copy.</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {p.primary && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Primary ramp</div>
                <div className="flex flex-wrap gap-2">
                  {buildRamp(p.primary).map((hex, i) => (
                    <button key={hex + i} className="w-14 h-10 rounded-md border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[10px] font-mono"
                      style={{ backgroundColor: hex, color: '#00000020' }}
                      title={hex}
                      onClick={()=>copy(hex)}>
                      {hex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {p.accent && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Accent ramp</div>
                <div className="flex flex-wrap gap-2">
                  {buildRamp(p.accent).map((hex, i) => (
                    <button key={hex + i} className="w-14 h-10 rounded-md border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[10px] font-mono"
                      style={{ backgroundColor: hex, color: '#00000020' }}
                      title={hex}
                      onClick={()=>copy(hex)}>
                      {hex}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Core UI roles with sample */}
      {(p.background || p.text || p.link) && (
        <Section title="Core roles (light)">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4" style={{ backgroundColor: p.background || '#ffffff', color: p.text || '#111111' }}>
                <div className="text-sm font-semibold mb-1">Sample heading</div>
                <p className="text-sm mb-1">This is sample body text to preview readability on the background color.</p>
                <a href="#" className="text-sm underline" style={{ color: p.link || '#2563eb' }}>This is a sample link</a>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {p.background && <Badge>Background {p.background}</Badge>}
              {p.text && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>copy(p.text as string)} title="Copy hex"><Badge>Text {p.text}</Badge></button>
                  {txtOnBg != null && (
                    <Badge>{txtOnBg >= 4.5 ? 'AA Pass' : 'AA Fail'} • {txtOnBg.toFixed(2)}:1</Badge>
                  )}
                </div>
              )}
              {p.link && (
                <div className="flex items-center gap-2">
                  <button type="button" onClick={()=>copy(p.link as string)} title="Copy hex"><Badge>Link {p.link}</Badge></button>
                  {lnkOnBg != null && (
                    <Badge>{lnkOnBg >= 4.5 ? 'AA Pass' : 'AA Fail'} • {lnkOnBg.toFixed(2)}:1</Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </Section>
      )}

      {/* Neutrals */}
      {(p.neutralLight || p.neutralDark) && (
        <Section title="Neutrals">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {p.neutralLight && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Neutral Light</div>
                <div className="h-12 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center" style={{ backgroundColor: p.neutralLight }}>
                  <span className="text-sm font-semibold" style={{ color: bestTextOn(p.neutralLight) }}>Aa</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={()=>copy(p.neutralLight as string)} title="Copy hex"><Badge>{p.neutralLight}</Badge></button>
                  {neuRatio != null && (
                    <Badge>{neuRatio >= 4.5 ? 'AA Pair Pass' : 'AA Pair Fail'} • {neuRatio.toFixed(2)}:1</Badge>
                  )}
                </div>
              </div>
            )}
            {p.neutralDark && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4 bg-white dark:bg-neutral-950">
                <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2">Neutral Dark</div>
                <div className="h-12 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center" style={{ backgroundColor: p.neutralDark }}>
                  <span className="text-sm font-semibold" style={{ color: bestTextOn(p.neutralDark) }}>Aa</span>
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <button type="button" onClick={()=>copy(p.neutralDark as string)} title="Copy hex"><Badge>{p.neutralDark}</Badge></button>
                  {neuRatio != null && (
                    <Badge>{neuRatio >= 4.5 ? 'AA Pair Pass' : 'AA Pair Fail'} • {neuRatio.toFixed(2)}:1</Badge>
                  )}
                </div>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Advanced: Design tokens (hidden by default) */}
      {Object.keys(tokens).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] tracking-widest uppercase text-neutral-600 dark:text-neutral-400">Advanced (developers)</h4>
            <button
              type="button"
              className="text-xs px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900"
              onClick={() => setShowAdvanced(v => !v)}
            >
              {showAdvanced ? 'Hide' : 'Show'}
            </button>
          </div>
          {showAdvanced && (
            <Section title="Design tokens">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">CSS variables</div>
                    <button className="text-[11px] underline" onClick={()=>copy(cssVarExport)}>Copy</button>
                  </div>
                  <pre className="text-[11px] leading-4 whitespace-pre-wrap break-all text-neutral-800 dark:text-neutral-200">{cssVarExport}</pre>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Tailwind config</div>
                    <button className="text-[11px] underline" onClick={()=>copy(tailwindExport)}>Copy</button>
                  </div>
                  <pre className="text-[11px] leading-4 whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200">{tailwindExport}</pre>
                </div>
                <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3 bg-white dark:bg-neutral-950">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">Style Dictionary</div>
                    <button className="text-[11px] underline" onClick={()=>copy(styleDictionaryExport)}>Copy</button>
                  </div>
                  <pre className="text-[11px] leading-4 whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200">{styleDictionaryExport}</pre>
                </div>
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Additional roles */}
      {extras.length > 0 && (
        <Section title="Additional roles">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {extras.map((k) => (
              <ColorSwatch key={k} name={k} hex={(p as any)[k]} isEditable={isEditing} onChange={(hex)=>onChange(k as keyof Palette, hex)} />
            ))}
          </div>
        </Section>
      )}
    </div>
  );
};

export default GuidePalette;

