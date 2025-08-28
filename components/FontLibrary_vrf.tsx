import React from 'react';
import Card from './common/Card_vrf';
import { TONE_TRAITS } from '../constants';
import { fontPairings, type FontPairing, headingFamilyNames, bodyFamilyNames, assetsFor, sourceLinksFor } from '../data/fonts_vrf';
import SuggestedFonts from './SuggestedFonts_vrf';
import FontPicker from './common/FontPicker_vrf';
import type { BrandGuide } from '../types';

const FontCard: React.FC<{ pairing: FontPairing; colors: { text: string; bg: string; border: string; link: string }, onAdd?: (p: FontPairing) => void, onRemove?: (p: FontPairing) => void, inGuide?: boolean, isCustom?: boolean, onUpdateCustom?: (oldName: string, updated: FontPairing) => void }> = ({ pairing, colors, onAdd, onRemove, inGuide = false, isCustom = false, onUpdateCustom }) => {
    const [loaded, setLoaded] = React.useState(false);
    const ref = React.useRef<HTMLDivElement | null>(null);

    const headingName = React.useMemo(() => pairing.heading.replace(/[\'\"]/g,'').split(',')[0].trim(), [pairing.heading]);
    const bodyName = React.useMemo(() => pairing.body.replace(/[\'\"]/g,'').split(',')[0].trim(), [pairing.body]);
    const headingSources = React.useMemo(() => sourceLinksFor(headingName), [headingName]);
    const bodySources = React.useMemo(() => sourceLinksFor(bodyName), [bodyName]);

    React.useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => { if (entry.isIntersecting) setLoaded(true); });
        }, { rootMargin: '200px' });
        obs.observe(el);
        return () => { obs.disconnect(); };
    }, []);

    const [editing, setEditing] = React.useState(false);
    const [editHeading, setEditHeading] = React.useState(headingName);
    const [editBody, setEditBody] = React.useState(bodyName);

    return (
        <Card>
            {loaded && (
                <style>
                    {pairing.headingImport}
                    {pairing.bodyImport}
                </style>
            )}
            <div ref={ref} className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold mb-2 text-neutral-900 dark:text-neutral-100">{pairing.name}</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">{pairing.description}</p>
              </div>
              <span className="text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-2 py-1 rounded-full whitespace-nowrap">{pairing.license}</span>
            </div>
            <div className="mt-4 p-4 md:p-5 rounded-md border shadow-sm" style={{ borderColor: colors.border, backgroundColor: colors.bg, color: colors.text }}>
                <h4 style={{ fontFamily: pairing.heading, color: colors.text, fontWeight: 800 }} className="text-3xl font-bold truncate">Heading: {headingName}</h4>
                <p style={{ fontFamily: pairing.body, color: colors.text }} className="mt-2 text-base">Body: The quick brown fox jumps over the lazy dog. This is sample body text to demonstrate readability and style.</p>
                <div className="mt-3 flex flex-wrap gap-3 items-center">
                    <a
                        href={`https://fonts.google.com/specimen/${headingName.replace(/\s+/g,'+')}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs underline font-medium"
                        style={{ color: colors.link }}
                    >Heading font</a>
                    <a
                        href={`https://fonts.google.com/specimen/${bodyName.replace(/\s+/g,'+')}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs underline font-medium"
                        style={{ color: colors.link }}
                    >Body font</a>
                    <button
                        onClick={() => navigator.clipboard.writeText(`${pairing.headingImport}\n${pairing.bodyImport}\n/* CSS usage */\nbody { font-family: ${pairing.body}; }\nh1,h2,h3 { font-family: ${pairing.heading}; }`)}
                        className="text-xs underline font-medium"
                        style={{ color: colors.link }}
                    >Copy web CSS</button>
                    {inGuide && onRemove ? (
                        <button
                          onClick={() => onRemove(pairing)}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 text-white"
                        >
                          Remove from Guide
                        </button>
                    ) : (onAdd ? (
                        <button
                          onClick={() => onAdd(pairing)}
                          className="px-3 py-1 rounded-md text-xs font-semibold"
                          style={{ backgroundColor: colors.link, color: '#fff' }}
                        >
                          Add to Guide
                        </button>
                    ) : null)}
                    {isCustom && onUpdateCustom && (
                        <button
                          onClick={() => { setEditing(e => !e); setEditHeading(headingName); setEditBody(bodyName); }}
                          className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800"
                        >
                          {editing ? 'Close' : 'Edit'}
                        </button>
                    )}
                    {/* Download/source links */}
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">Sources:</span>
                    {headingSources.slice(0,2).map((s, idx) => (
                        <a key={`h-${idx}-${s.url}`} href={s.url} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: colors.link }}>{s.label}</a>
                    ))}
                    {bodySources.slice(0,2).map((s, idx) => (
                        <a key={`b-${idx}-${s.url}`} href={s.url} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: colors.link }}>{s.label}</a>
                    ))}
                </div>
                {isCustom && onUpdateCustom && editing && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-t border-neutral-200 dark:border-neutral-800 pt-3">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Heading</label>
                      <div className="text-xs text-neutral-500 mb-1">Current: {headingName}</div>
                      <input
                        value={editHeading}
                        onChange={(e)=>setEditHeading(e.target.value)}
                        placeholder="e.g., Poppins"
                        className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Body</label>
                      <div className="text-xs text-neutral-500 mb-1">Current: {bodyName}</div>
                      <input
                        value={editBody}
                        onChange={(e)=>setEditBody(e.target.value)}
                        placeholder="e.g., Lora"
                        className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 md:justify-end">
                      <button
                        onClick={() => {
                          const hAssets = assetsFor(editHeading.trim() || headingName, 'heading');
                          const bAssets = assetsFor(editBody.trim() || bodyName, 'body');
                          const updated: FontPairing = {
                            name: `${editHeading.trim() || headingName} + ${editBody.trim() || bodyName}`,
                            heading: hAssets.css,
                            body: bAssets.css,
                            headingImport: hAssets.import,
                            bodyImport: bAssets.import,
                            traits: pairing.traits || [],
                            license: hAssets.license || bAssets.license || pairing.license,
                            description: `${editHeading.trim() || headingName} headings with ${editBody.trim() || bodyName} body`,
                          };
                          onUpdateCustom(pairing.name || `${headingName} + ${bodyName}`, updated);
                          setEditing(false);
                        }}
                        className="px-3 py-2 rounded-md bg-neutral-200 dark:bg-neutral-800 text-sm"
                      >Done</button>
                    </div>
                  </div>
                )}
            </div>
        </Card>
    );
};

const PAGE_SIZE = 20;

const FontLibrary: React.FC<{ brandGuide: BrandGuide | null; onAddFontPairing?: (p: { name?: string; heading: string; body: string }) => void; onRemoveFontPairing?: (p: { name?: string; heading: string; body: string }) => void }> = ({ brandGuide, onAddFontPairing, onRemoveFontPairing }) => {
    const headingNames = React.useMemo(() => headingFamilyNames(), []);
    const bodyNames = React.useMemo(() => bodyFamilyNames(), []);
    const [customHeading, setCustomHeading] = React.useState<string>(headingNames[0] || 'Inter');
    const [customBody, setCustomBody] = React.useState<string>(bodyNames[0] || 'Inter');
    const [mode, setMode] = React.useState<'light' | 'dark'>('light');

    const palette = brandGuide?.palette || {} as any;
    const isDark = mode === 'dark';
    const textColor = isDark ? (palette.textDark || '#f5f5f5') : ((palette as any).text || palette.neutralDark || '#111111');
    const bgColor = isDark ? (palette.backgroundDark || '#0b0b0b') : ((palette as any).background || palette.neutralLight || '#ffffff');
    const borderColor = palette.primary || palette.accent || palette.neutralDark || '#999999';
    const linkColor = isDark ? ((palette as any).linkDark || palette.primary || palette.accent || '#60a5fa') : ((palette as any).link || palette.primary || palette.accent || '#2563eb');
    const buildPreview = (h: string, b: string) => {
        const hAssets = assetsFor(h, 'heading');
        const bAssets = assetsFor(b, 'body');
        return {
            name: `${h} + ${b}`,
            heading: hAssets.css,
            body: bAssets.css,
            headingImport: hAssets.import,
            bodyImport: bAssets.import,
            traits: [],
            license: hAssets.license || bAssets.license,
            description: `${h} headings with ${b} body`,
        } as FontPairing;
    };
    const [customSaved, setCustomSaved] = React.useState<FontPairing[]>(() => {
        try { return JSON.parse(localStorage.getItem('customFontPairings') || '[]'); } catch { return []; }
    });
    const preview = React.useMemo(() => buildPreview(customHeading, customBody), [customHeading, customBody]);
    const saveCustom = () => {
        const next = [preview, ...customSaved.filter(p => p.name !== preview.name)];
        setCustomSaved(next);
        localStorage.setItem('customFontPairings', JSON.stringify(next));
    };
    const [selectedTrait, setSelectedTrait] = React.useState<string | null>(null);
    const [search, setSearch] = React.useState<string>('');
    const [visibleCount, setVisibleCount] = React.useState(PAGE_SIZE);

    const availableTraits = ['All', ...TONE_TRAITS];

    const filteredPairings = React.useMemo(() => {
        const base = selectedTrait ? fontPairings.filter(p => p.traits.includes(selectedTrait)) : fontPairings;
        const term = search.trim().toLowerCase();
        if (!term) return base;
        return base.filter(p =>
            p.name.toLowerCase().includes(term) ||
            p.description.toLowerCase().includes(term) ||
            p.traits.some(t => t.toLowerCase().includes(term))
        );
    }, [selectedTrait, search]);

    const visible = filteredPairings.slice(0, visibleCount);
    const canLoadMore = visibleCount < filteredPairings.length;

    React.useEffect(() => { setVisibleCount(PAGE_SIZE); }, [selectedTrait, search]);

    if (!brandGuide) {
        return (
            <div className="text-center max-w-lg mx-auto">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="mt-4 text-2xl font-bold">Generate a Brand Guide First</h2>
                <p className="text-neutral-500 dark:text-neutral-400 mt-2">Generate your brand guide to unlock the Font Library and get tailored suggestions.</p>
            </div>
        );
    }
    return (
        <div className="max-w-5xl mx-auto">
            <h1 className="text-4xl font-extrabold text-neutral-900 dark:text-white mb-2">Font Library</h1>
            <p className="text-lg text-neutral-500 dark:text-neutral-400">
                Curated font pairings to match your brand's personality. Filter by trait or search to find the perfect fit.
            </p>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Tip: Type any Google Fonts family name in the custom inputs below to access 400+ families.</p>
              <div className="inline-flex items-center gap-2">
                <span className="text-sm text-neutral-500 dark:text-neutral-400">Theme:</span>
                <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setMode('light')}
                    className={`px-3 py-1 text-sm ${mode==='light' ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-transparent'}`}
                  >Light</button>
                  <button
                    type="button"
                    onClick={() => setMode('dark')}
                    className={`px-3 py-1 text-sm ${mode==='dark' ? 'bg-neutral-200 dark:bg-neutral-700' : 'bg-transparent'}`}
                  >Dark</button>
                </div>
              </div>
            </div>

            <SuggestedFonts brandGuide={brandGuide} max={5} mode={mode} onAdd={(p)=> onAddFontPairing && onAddFontPairing({ name: p.name, heading: p.heading, body: p.body })} onRemove={(p)=> onRemoveFontPairing && onRemoveFontPairing({ name: p.name, heading: p.heading, body: p.body })} />

            <Card className="mb-6" title="Build Your Own Pairing" description="Pick any two fonts and preview instantly">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FontPicker
                        label="Heading font"
                        value={customHeading}
                        onChange={setCustomHeading}
                        options={headingNames}
                        placeholder="Search or type any Google Fonts family"
                        sampleText="HEADLINE — The quick brown fox"
                    />
                    <FontPicker
                        label="Body font"
                        value={customBody}
                        onChange={setCustomBody}
                        options={bodyNames}
                        placeholder="Search or type any Google Fonts family"
                        sampleText="Body — The quick brown fox jumps over the lazy dog"
                    />
                    <div className="flex items-end">
                        <button onClick={saveCustom} className="px-4 py-2 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-black text-sm">Save pairing</button>
                    </div>
                </div>
                <div className="mt-5 p-5 md:p-6 rounded-lg border-2 shadow-sm" style={{ backgroundColor: bgColor, color: textColor, borderColor: borderColor }}>
                    <style>
                        {preview.headingImport}
                        {preview.bodyImport}
                    </style>
                    <p style={{ fontFamily: preview.heading, color: textColor, fontWeight: 800 }} className="text-xl mb-2">Heading Preview ({customHeading})</p>
                    <p style={{ fontFamily: preview.body, color: textColor }} className="text-sm">Body Preview ({customBody}): The quick brown fox jumps over the lazy dog.</p>
                </div>
            </Card>

            <div className="mb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                <div className="flex flex-wrap gap-2">
                    {availableTraits.map(trait => (
                      <button
                        key={trait}
                        onClick={() => setSelectedTrait(trait === 'All' ? null : trait)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          (selectedTrait === trait || (trait === 'All' && selectedTrait === null)) 
                          ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' 
                          : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                        }`}
                      >
                        {trait}
                      </button>
                    ))}
                </div>
                <div className="flex-1 md:max-w-xs">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search fonts, traits, descriptions..."
                        className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                    />
                </div>
            </div>

            {customSaved.length > 0 && (
                <>
                    <h2 className="text-xl font-bold mb-2">Your Pairings</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {customSaved.map(p => {
                          const inGuide = !!(brandGuide.fontPairings || []).some(x => x.heading === p.heading && x.body === p.body);
                          return (
                            <FontCard
                              key={`custom-${p.name}`}
                              pairing={p}
                              colors={{ text: textColor, bg: bgColor, border: borderColor, link: linkColor }}
                              onAdd={onAddFontPairing ? (fp)=> onAddFontPairing({ name: fp.name, heading: fp.heading, body: fp.body }) : undefined}
                              onRemove={onRemoveFontPairing ? (fp)=> onRemoveFontPairing({ name: fp.name, heading: fp.heading, body: fp.body }) : undefined}
                              inGuide={inGuide}
                              isCustom={true}
                              onUpdateCustom={(oldName, updated) => {
                                setCustomSaved(list => {
                                  const next = list.map(item => item.name === oldName ? updated : item);
                                  try { localStorage.setItem('customFontPairings', JSON.stringify(next)); } catch {}
                                  return next;
                                });
                              }}
                            />
                          );
                        })}
                    </div>
                </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {visible.map((pairing) => {
                    const inGuide = !!(brandGuide.fontPairings || []).some(x => x.heading === pairing.heading && x.body === pairing.body);
                    return (
                      <FontCard
                        key={`${pairing.name}-${pairing.heading}`}
                        pairing={pairing}
                        colors={{ text: textColor, bg: bgColor, border: borderColor, link: linkColor }}
                        onAdd={onAddFontPairing ? (fp)=> onAddFontPairing({ name: fp.name, heading: fp.heading, body: fp.body }) : undefined}
                        onRemove={onRemoveFontPairing ? (fp)=> onRemoveFontPairing({ name: fp.name, heading: fp.heading, body: fp.body }) : undefined}
                        inGuide={inGuide}
                      />
                    );
                })}
            </div>
            {visible.length === 0 && (
                <div className="text-center md:col-span-2 py-12">
                    <p className="text-neutral-500 dark:text-neutral-400">No font pairings match your filters.</p>
                </div>
            )}

            {canLoadMore && (
                <div className="flex justify-center mt-6">
                    <button
                        onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                        className="px-4 py-2 rounded-md bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-sm"
                    >
                        Load more
                    </button>
                </div>
            )}
        </div>
    );
};

export default FontLibrary;

