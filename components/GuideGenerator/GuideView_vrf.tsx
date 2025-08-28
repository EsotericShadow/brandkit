import React from 'react';
import Button from '../common/Button_vrf';
import Card from '../common/Card_vrf';
import EditableSection from '../common/EditableSection_vrf';
import SuggestedFonts from '../SuggestedFonts_vrf';
import { assetsFor, googleFontsSpecimenUrl } from '../../data/fonts_vrf';
import ColorSwatch from './ColorSwatch_vrf';
import type { BrandGuide, Palette } from '../../types';

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
  return (
    <div className="animate-slide-in space-y-6">
      <Card>
        <div className="mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex flex-wrap justify-between items-start gap-4">
            <div>
              {guide.logoUrl && <img src={guide.logoUrl} alt={`${guide.brandName} Logo`} className="max-h-12 mb-2" />}
              <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-white">{guide.brandName} Style Guide</h1>
              <p className="text-neutral-500 dark:text-neutral-400">{guide.industry}</p>
            </div>
            <div className="flex gap-2 self-start flex-shrink-0">
              {isEditing ? (
                <>
                  <Button onClick={onCancelClick} variant="secondary">Cancel</Button>
                  <Button onClick={onSaveClick}>Save</Button>
                </>
              ) : (
                <>
                  <Button onClick={onReset} variant="ghost">Start Over</Button>
                  <Button onClick={onEditClick} variant="secondary">Edit</Button>
                  <Button onClick={downloadMarkdown}>Export</Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-4">Color Palette</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 justify-items-center p-4 bg-neutral-100 dark:bg-neutral-900/50 rounded-lg">
              {(() => {
                const order = ['primary','secondary','accent','background','text','link','neutralLight','neutralDark','onPrimary'];
                const entries = order
                  .map(k => [k, (guide.palette as any)[k]] as [string, string | undefined])
                  .filter(([,hex]) => !!hex) as [string,string][];
                // Include any custom roles not in the order at the end
                const extras = Object.keys(guide.palette)
                  .filter(k => !order.includes(k))
                  .map(k => [k, (guide.palette as any)[k]] as [string,string]);
                return [...entries, ...extras].map(([key, hex]) => (
                  <ColorSwatch
                    key={key}
                    name={key}
                    hex={hex}
                    isEditable={isEditing}
                    onChange={(h) => handleEditablePaletteChange(key as any, h as any)}
                  />
                ));
              })()}
            </div>
          </div>
          <EditableSection title="Mission" content={guide.mission} onChange={(c) => handleEditableGuideChange('mission', c)} isEditing={isEditing} />
          <EditableSection title="Elevator Pitch" content={guide.elevatorPitch} onChange={(c) => handleEditableGuideChange('elevatorPitch', c)} isEditing={isEditing} />
          <EditableSection title="Audience" content={guide.audience} onChange={(c) => handleEditableGuideChange('audience', c)} isEditing={isEditing} />
          <EditableSection title="Tone & Voice" content={guide.tone.description} onChange={handleEditableToneChange} isEditing={isEditing} rows={8}/>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Dos and Don'ts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <h4 className="font-semibold text-neutral-800 dark:text-neutral-200">Dos</h4>
                </div>
                <div className="space-y-2">
                  {guide.tone.dosAndDonts.dos.map((item, i) => (
                    isEditing ? (
                      <textarea
                        key={i}
                        value={item}
                        onChange={e => handleDosAndDontsChange('dos', i, e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm"
                      />
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
                  {guide.tone.dosAndDonts.donts.map((item, i) => (
                    isEditing ? (
                      <textarea
                        key={i}
                        value={item}
                        onChange={e => handleDosAndDontsChange('donts', i, e.target.value)}
                        rows={2}
                        className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm"
                      />
                    ) : (
                      <p key={i} className="p-2 bg-neutral-100 dark:bg-neutral-900 rounded-md text-sm text-neutral-600 dark:text-neutral-300">{item}</p>
                    )
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Brand Fonts</h3>
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
                              {/* lightweight picker via text input substitute: user types family name */}
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
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Suggested Fonts</h3>
            <SuggestedFonts brandGuide={guide} max={2} onAdd={isEditing ? ((p)=>{
              const next = [...(guide.fontPairings || [])];
              if (!next.some(x => x.heading === p.heading && x.body === p.body)) next.push({ name: p.name, heading: p.heading, body: p.body } as any);
              handleEditableGuideChange('fontPairings', next as any);
            }) : undefined} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100 mb-2">Taglines</h3>
            <div className="space-y-4">
              {guide.taglines.map((item, i) => (
                <div key={i}>
                  {isEditing ? (
                    <div className="space-y-2 p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg">
                      <input type="text" value={item.tagline} onChange={e => handleTaglineChange(i, 'tagline', e.target.value)} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md font-semibold"/>
                      <textarea value={item.rationale} onChange={e => handleTaglineChange(i, 'rationale', e.target.value)} rows={2} className="w-full p-2 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md text-sm" placeholder="Rationale..."/>
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
        </div>
      </Card>
    </div>
  );
};

export default GuideView;

