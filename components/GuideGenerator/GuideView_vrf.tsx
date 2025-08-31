import React from 'react';
import Button from '../common/Button_vrf';
import Card from '../common/Card_vrf';
import EditableSection from '../common/EditableSection_vrf';
import SuggestedFonts from '../SuggestedFonts_vrf';
import { assetsFor, googleFontsSpecimenUrl } from '../../data/fonts_vrf';
import ColorSwatch from './ColorSwatch_vrf';
import GuidePalette from './GuidePalette_vrf';
import SectionBlock from './SectionBlock_vrf';
import GuideTOC from './GuideTOC_vrf';
import GuideLogo from './GuideLogo_vrf';
import type { BrandGuide, Palette } from '../../types';

// Per-section editing wrappers
const PaletteSection: React.FC<{ palette: Palette; onChange: (name: keyof Palette, hex: string) => void }> = ({ palette, onChange }) => {
  const [editing, setEditing] = React.useState(false);
  return (
    <div>
      <div className="flex justify-end mb-2">
        <div className="flex gap-2">
          <button onClick={()=> setEditing(e=>!e)} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>
      <GuidePalette palette={palette} isEditing={editing} onChange={onChange} />
    </div>
  );
};

const TextSection: React.FC<{ value: string; rows?: number; onSave: (v: string) => void }> = ({ value, rows=6, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  React.useEffect(()=> setDraft(value), [value]);
  return (
    <div>
      <div className="flex justify-end mb-2">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={()=> { setDraft(value); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Cancel</button>
            <button onClick={()=> { onSave(draft); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">Save</button>
          </div>
        ) : (
          <button onClick={()=> setEditing(true)} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Edit</button>
        )}
      </div>
      <EditableSection title="" content={draft} onChange={setDraft} isEditing={editing} rows={rows} />
    </div>
  );
};

const MissionSection: React.FC<{ value: string; onSave: (v:string)=>void }> = ({ value, onSave }) => (
  <TextSection value={value} onSave={onSave} rows={6} />
);
const PitchSection: React.FC<{ value: string; onSave: (v:string)=>void }> = ({ value, onSave }) => (
  <TextSection value={value} onSave={onSave} rows={6} />
);
const AudienceSection: React.FC<{ value: string; onSave: (v:string)=>void }> = ({ value, onSave }) => (
  <TextSection value={value} onSave={onSave} rows={6} />
);
const ToneSection: React.FC<{ value: string; onSave: (v:string)=>void }> = ({ value, onSave }) => (
  <TextSection value={value} onSave={onSave} rows={8} />
);

const DosDontsSection: React.FC<{ dos: string[]; donts: string[]; onSave: (next: { dos: string[]; donts: string[] }) => void }> = ({ dos, donts, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [dosDraft, setDosDraft] = React.useState<string[]>(dos);
  const [dontsDraft, setDontsDraft] = React.useState<string[]>(donts);
  React.useEffect(()=> { setDosDraft(dos); setDontsDraft(donts); }, [dos, donts]);
  return (
    <div>
      <div className="flex justify-end mb-2">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={()=> { setDosDraft(dos); setDontsDraft(donts); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Cancel</button>
            <button onClick={()=> { onSave({ dos: dosDraft, donts: dontsDraft }); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">Save</button>
          </div>
        ) : (
          <button onClick={()=> setEditing(true)} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Edit</button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Dos</h4>
          </div>
          <div className="space-y-2">
            {(editing ? dosDraft : dos).map((item, i) => (
              editing ? (
                <textarea key={i} value={dosDraft[i]} onChange={e=>{
                  const next = [...dosDraft]; next[i] = e.target.value; setDosDraft(next);
                }} rows={2} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm" />
              ) : (
                <p key={i} className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md text-sm text-neutral-600 dark:text-neutral-300">{item}</p>
              )
            ))}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Don'ts</h4>
          </div>
          <div className="space-y-2">
            {(editing ? dontsDraft : donts).map((item, i) => (
              editing ? (
                <textarea key={i} value={dontsDraft[i]} onChange={e=>{
                  const next = [...dontsDraft]; next[i] = e.target.value; setDontsDraft(next);
                }} rows={2} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm" />
              ) : (
                <p key={i} className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md text-sm text-neutral-600 dark:text-neutral-300">{item}</p>
              )
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const TaglinesSection: React.FC<{ items: { tagline: string; rationale: string }[]; onSave: (items: { tagline: string; rationale: string }[]) => void }> = ({ items, onSave }) => {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(items);
  React.useEffect(()=> setDraft(items), [items]);
  return (
    <div>
      <div className="flex justify-end mb-2">
        {editing ? (
          <div className="flex gap-2">
            <button onClick={()=> { setDraft(items); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Cancel</button>
            <button onClick={()=> { onSave(draft); setEditing(false); }} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">Save</button>
          </div>
        ) : (
          <button onClick={()=> setEditing(true)} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">Edit</button>
        )}
      </div>
      <div className="space-y-4">
        {(editing ? draft : items).map((item, i) => (
          <div key={i}>
            {editing ? (
              <div className="space-y-2 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                <input type="text" value={draft[i].tagline} onChange={e=>{
                  const next = [...draft]; next[i] = { ...next[i], tagline: e.target.value }; setDraft(next);
                }} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md font-semibold" />
                <textarea value={draft[i].rationale} onChange={e=>{
                  const next = [...draft]; next[i] = { ...next[i], rationale: e.target.value }; setDraft(next);
                }} rows={2} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm" placeholder="Rationale..." />
              </div>
            ) : (
              <div className="p-4 bg-neutral-100 dark:bg-neutral-900 rounded-md">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100">"{item.tagline}"</p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1"><span className="font-medium">Rationale:</span> {item.rationale}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

interface Props {
  guide: BrandGuide;
  isEditing: boolean;
  onEditClick: () => void;
  onCancelClick: () => void;
  onSaveClick: () => void;
  onReset: () => void;
  downloadMarkdown: () => void;
  handleEditableGuideChange: <K extends keyof BrandGuide>(field: K, value: BrandGuide[K]) => void;
  handleEditableToneChange: (newDescription: string) => void;
  handleEditablePaletteChange: (colorName: keyof Palette, value: string) => void;
  handleTaglineChange: (index: number, field: 'tagline' | 'rationale', value: string) => void;
  handleDosAndDontsChange: (type: 'dos' | 'donts', index: number, value: string) => void;
}

const GuideView: React.FC<Props> = ({
  guide,
  isEditing,
  onEditClick,
  onCancelClick,
  onSaveClick,
  onReset,
  downloadMarkdown,
  handleEditableGuideChange,
  handleEditableToneChange,
  handleEditablePaletteChange,
  handleTaglineChange,
  handleDosAndDontsChange,
}) => {
  const [editingFontIdx, setEditingFontIdx] = React.useState<number | null>(null);

  const palette = (guide?.palette || {}) as any;
  const quickChips: Array<{ label: string; hex?: string }> = [
    { label: 'Primary', hex: palette.primary },
    { label: 'Accent', hex: palette.accent },
    { label: 'Background', hex: palette.background },
    { label: 'Text', hex: palette.text },
    { label: 'Link', hex: palette.link },
  ];

  const sections = [
    { id: 'logo', title: 'Logo' },
    { id: 'palette', title: 'Color Palette' },
    { id: 'mission', title: 'Mission' },
    { id: 'pitch', title: 'Elevator Pitch' },
    { id: 'audience', title: 'Audience' },
    { id: 'tone', title: 'Tone & Voice' },
    { id: 'dosdonts', title: "Dos and Don'ts" },
    { id: 'fonts', title: 'Brand Fonts' },
    { id: 'suggested-fonts', title: 'Suggested Fonts' },
    { id: 'taglines', title: 'Taglines' },
  ];

  return (
    <div className="animate-slide-in">
      {/* Header */}
      <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            {guide.logoUrl && <img src={guide.logoUrl} alt={`${guide.brandName} Logo`} className="max-h-16 mb-2 object-contain" />}
            <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white">{guide.brandName} Style Guide</h1>
            <p className="text-neutral-500 dark:text-neutral-400">{guide.industry}</p>
            {/* Quick palette summary */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {quickChips.map((c) => (
                <div key={c.label} className="flex items-center gap-1 text-xs">
                  <span className="inline-block w-4 h-4 rounded-sm border border-neutral-300 dark:border-neutral-700" style={{ backgroundColor: c.hex || '#e5e7eb' }} />
                  <span className="text-neutral-600 dark:text-neutral-300">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-2 self-start flex-shrink-0">
            <Button onClick={onReset} variant="ghost">Start Over</Button>
            <Button onClick={downloadMarkdown}>Export</Button>
          </div>
        </div>
      </div>

      {/* Body grid with TOC */}
      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 lg:col-span-9 space-y-6">
          <SectionBlock id="logo" title="Logo" description="Brand mark on key backgrounds.">
            <GuideLogo logoUrl={guide.logoUrl} palette={guide.palette} />
          </SectionBlock>

          {/* Local edit toggle for palette */}
          <SectionBlock id="palette" title="Color Palette" description="Your brand system, with accessible defaults and developer-ready tokens.">
            <PaletteSection
              palette={guide.palette}
              onChange={(name: any, hex: string) => handleEditablePaletteChange(name, hex)}
            />
          </SectionBlock>

          <SectionBlock id="mission" title="Mission" description="What you stand for and why you exist.">
            <MissionSection value={guide.mission} onSave={(v)=>handleEditableGuideChange('mission', v)} />
          </SectionBlock>

          <SectionBlock id="pitch" title="Elevator Pitch" description="A concise, compelling description of your brand.">
            <PitchSection value={guide.elevatorPitch} onSave={(v)=>handleEditableGuideChange('elevatorPitch', v)} />
          </SectionBlock>

          <SectionBlock id="audience" title="Audience" description="Who you’re speaking to and what they care about.">
            <AudienceSection value={guide.audience} onSave={(v)=>handleEditableGuideChange('audience', v)} />
          </SectionBlock>

          <SectionBlock id="tone" title="Tone & Voice" description="Guidance for how your brand speaks across contexts.">
            <ToneSection value={guide.tone.description} onSave={(v)=>handleEditableToneChange(v)} />
          </SectionBlock>

          <SectionBlock id="dosdonts" title="Dos and Don'ts" description="Practical rules to keep content consistent and on-brand.">
            <DosDontsSection
              dos={guide.tone.dosAndDonts.dos}
              donts={guide.tone.dosAndDonts.donts}
              onSave={(next)=>handleEditableGuideChange('tone', { ...guide.tone, dosAndDonts: next } as any)}
            />
          </SectionBlock>

          <SectionBlock id="fonts" title="Brand Fonts" description="Chosen pairings with legibility previews.">
            {(guide.fontPairings && guide.fontPairings.length > 0) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guide.fontPairings.map((fp, idx) => {
                  const firstFamily = (stack: string) => stack.trim().split(',')[0].replace(/^['\"]|['\"]$/g,'').trim();
                  const hName = firstFamily(fp.heading || 'Inter');
                  const bName = firstFamily(fp.body || 'Inter');
                  const hImport = assetsFor(hName, 'heading').import;
                  const bImport = assetsFor(bName, 'body').import;
                  const palette: any = guide?.palette || {};
                  const textColor = (palette.text || palette.neutralDark || '#111111');
                  const bgColor = (palette.background || palette.neutralLight || '#ffffff');
                  const borderColor = palette.primary || palette.accent || palette.neutralDark || '#999999';
                  const linkColor = (palette.link || palette.primary || palette.accent || '#2563eb');
                  return (
                    <div key={idx} className="rounded-md border shadow-sm p-4 md:p-5" style={{ backgroundColor: bgColor, color: textColor, borderColor }}>
                      <style>
                        {hImport}
                        {bImport}
                      </style>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold" style={{ color: textColor }}>{fp.name || `${hName} + ${bName}`}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: borderColor + '20', color: textColor }}>Custom</span>
                      </div>
                      <p style={{ fontFamily: fp.heading, color: textColor, fontWeight: 800 }} className="mt-2 text-xl">Heading Sample</p>
                      <p style={{ fontFamily: fp.body, color: textColor }} className="text-sm">Body sample: The quick brown fox jumps over the lazy dog.</p>
                      <div className="mt-3 flex flex-wrap gap-3 items-center">
                        <a href={googleFontsSpecimenUrl(hName)} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: linkColor }}>Heading font</a>
                        <a href={googleFontsSpecimenUrl(bName)} target="_blank" rel="noreferrer" className="text-xs underline font-medium" style={{ color: linkColor }}>Body font</a>
                        <button onClick={() => navigator.clipboard.writeText(`${hImport}\n${bImport}\n/* CSS usage */\nbody { font-family: ${fp.body}; }\nh1,h2,h3 { font-family: ${fp.heading}; }`)} className="text-xs underline font-medium" style={{ color: linkColor }}>Copy web CSS</button>
                        <button onClick={() => setEditingFontIdx(editingFontIdx === idx ? null : idx)} className="px-3 py-1 rounded-md text-xs font-semibold bg-neutral-200 dark:bg-neutral-800">{editingFontIdx === idx ? 'Close' : 'Edit'}</button>
                        <button onClick={() => {
                          const next = (guide.fontPairings || []).filter((_, i) => i !== idx);
                          handleEditableGuideChange('fontPairings', next as any);
                        }} className="px-3 py-1 rounded-md text-xs font-semibold bg-red-600 text-white">Remove</button>
                      </div>
                      {editingFontIdx === idx && (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 items-end border-t border-neutral-200 dark:border-neutral-800 pt-3">
                          <div>
                            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Heading</label>
                            <div className="text-xs text-neutral-500 mb-1">Current: {hName}</div>
                            <div className="flex-1">
                              <input
                                defaultValue={hName}
                                onBlur={(e)=>{
                                  const fam = e.target.value.trim();
                                  if (!fam) return;
                                  const css = assetsFor(fam, 'heading').css;
                                  const next = [...(guide.fontPairings || [])];
                                  next[idx] = { ...fp, heading: css } as any;
                                  handleEditableGuideChange('fontPairings', next as any);
                                }}
                                placeholder="e.g., Poppins"
                                className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300 mb-1">Body</label>
                            <div className="text-xs text-neutral-500 mb-1">Current: {bName}</div>
                            <input
                              defaultValue={bName}
                              onBlur={(e)=>{
                                const fam = e.target.value.trim();
                                if (!fam) return;
                                const css = assetsFor(fam, 'body').css;
                                const next = [...(guide.fontPairings || [])];
                                next[idx] = { ...fp, body: css } as any;
                                handleEditableGuideChange('fontPairings', next as any);
                              }}
                              placeholder="e.g., Lora"
                              className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
                            />
                          </div>
                          <div className="flex gap-2 md:justify-end">
                            <button onClick={()=> setEditingFontIdx(null)} className="px-3 py-2 rounded-md bg-neutral-200 dark:bg-neutral-800 text-sm">Done</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No brand fonts yet. Add from suggestions below or the Font Library.</p>
            )}
          </SectionBlock>

          <SectionBlock id="suggested-fonts" title="Suggested Fonts" description="Quick picks you can add as pairings.">
            <SuggestedFonts brandGuide={guide} max={2} onAdd={(p)=>{
              const next = [...(guide.fontPairings || [])];
              if (!next.some(x => x.heading === p.heading && x.body === p.body)) next.push({ name: p.name, heading: p.heading, body: p.body } as any);
              handleEditableGuideChange('fontPairings', next as any);
            }} />
          </SectionBlock>

          <SectionBlock id="taglines" title="Taglines" description="Potential lines and rationales.">
            <TaglinesSection items={guide.taglines} onSave={(items)=> handleEditableGuideChange('taglines', items as any)} />
          </SectionBlock>
        </div>

        {/* TOC aside */}
        <aside className="col-span-12 lg:col-span-3 lg:sticky lg:top-20 self-start h-fit">
          <Card>
            <GuideTOC sections={sections} />
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default GuideView;

