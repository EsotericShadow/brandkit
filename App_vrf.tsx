import React from 'react';
import Sidebar from './components/Sidebar_vrf';
import GuideGenerator from './components/GuideGenerator/index_vrf';
import GuideView from './components/GuideGenerator/GuideView_vrf';
import VoiceRewriter from './components/VoiceRewriter_vrf';
import FontLibrary from './components/FontLibrary_vrf';
import PaletteOnly from './components/PaletteOnly_vrf';
import type { AppState, BrandGuide, Palette } from './types';
import { AppView } from './types';
import { useToast } from './components/common/ToastProvider_vrf';

const initialState: AppState = {
  view: AppView.GUIDE_GENERATOR,
  brandGuide: null,
  isGenerated: false,
};

const App: React.FC = () => {
  const [state, setState] = React.useState<AppState>(() => {
    try {
      const stored = localStorage.getItem('brandGuide');
      const guide: BrandGuide | null = stored ? JSON.parse(stored) : null;
      return {
        view: AppView.GUIDE_GENERATOR,
        brandGuide: guide,
        isGenerated: !!guide,
      };
    } catch {
      return initialState;
    }
  });

  const setView = (view: AppView) => setState(s => ({ ...s, view }));
  const onGuideGenerated = (guide: BrandGuide) => {
    setState({ view: AppView.GUIDE_GENERATOR, brandGuide: guide, isGenerated: true });
    try { localStorage.setItem('brandGuide', JSON.stringify(guide)); } catch {}
  };

  const [isEditing, setIsEditing] = React.useState(false);
  const [editableGuide, setEditableGuide] = React.useState<BrandGuide | null>(null);

  const { showToast } = useToast();

  const downloadMarkdown = () => {
    if (!state.brandGuide) return;
    const md = `# ${state.brandGuide.brandName} Style Guide\n\nIndustry: ${state.brandGuide.industry}`;
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${state.brandGuide.brandName}-style-guide.md`; a.click();
    URL.revokeObjectURL(url);
    showToast('Exported style guide markdown');
  };

  const content = (() => {
    switch (state.view) {
      case AppView.GUIDE_GENERATOR:
        if (!state.brandGuide) {
          return (
            <GuideGenerator
              initialGuide={state.brandGuide}
              onGuideGenerated={(g) => { onGuideGenerated(g); setIsEditing(false); setEditableGuide(null); }}
              onReset={() => setState(initialState)}
            />
          );
        }
        return (
          <GuideView
            guide={editableGuide || state.brandGuide}
            isEditing={isEditing}
            onEditClick={() => { setIsEditing(true); setEditableGuide(state.brandGuide); }}
            onCancelClick={() => { setIsEditing(false); setEditableGuide(null); }}
            onSaveClick={() => { if (editableGuide) { onGuideGenerated(editableGuide); setIsEditing(false); setEditableGuide(null); showToast('Saved changes'); } }}
            onReset={() => { setState(initialState); setIsEditing(false); setEditableGuide(null); }}
            downloadMarkdown={downloadMarkdown}
            handleEditableGuideChange={(field, value) => setEditableGuide(g => ({ ...(g || state.brandGuide!), [field]: value } as BrandGuide))}
            handleEditableToneChange={(newDescription) => setEditableGuide(g => ({ ...(g || state.brandGuide!), tone: { ...(g || state.brandGuide!).tone, description: newDescription } }))}
            handleEditablePaletteChange={(colorName: keyof Palette, value: string) => setEditableGuide(g => ({ ...(g || state.brandGuide!), palette: { ...(g || state.brandGuide!).palette, [colorName]: value } }))}
            handleTaglineChange={(index, field, value) => setEditableGuide(g => {
              const base = (g || state.brandGuide!);
              const next = [...base.taglines];
              const item = { ...next[index], [field]: value } as any;
              next[index] = item;
              return { ...base, taglines: next };
            })}
            handleDosAndDontsChange={(type, index, value) => setEditableGuide(g => {
              const base = (g || state.brandGuide!);
              const lists = { ...base.tone.dosAndDonts } as any;
              const nextList = [...lists[type]];
              nextList[index] = value;
              return { ...base, tone: { ...base.tone, dosAndDonts: { ...lists, [type]: nextList } } };
            })}
          />
        );
      case AppView.PALETTE_GENERATOR:
        return <PaletteOnly
          onBackToGuide={() => setView(AppView.GUIDE_GENERATOR)}
          brandGuide={state.brandGuide}
          onApplyPalette={(palette) => {
            if (!state.brandGuide) { setView(AppView.GUIDE_GENERATOR); return; }
            const updated = { ...state.brandGuide, palette: { ...state.brandGuide.palette, ...palette } } as BrandGuide;
            setState(s => ({ ...s, brandGuide: updated, isGenerated: true }));
            try { localStorage.setItem('brandGuide', JSON.stringify(updated)); } catch {}
            showToast('Applied palette to guide');
          }}
        />;
      case AppView.VOICE_REWRITER:
        return <VoiceRewriter brandGuide={state.brandGuide} />;
      case AppView.FONT_LIBRARY:
        return <FontLibrary brandGuide={state.brandGuide} onAddFontPairing={(p)=>{
          if (!state.brandGuide) return;
          const base = state.brandGuide;
          const existing = base.fontPairings || [];
          const dupe = existing.some(x => x.heading === p.heading && x.body === p.body);
          if (dupe) { showToast('This pairing is already in your guide'); return; }
          const nextGuide = { ...base, fontPairings: [{ name: p.name, heading: p.heading, body: p.body }, ...existing] } as BrandGuide;
          setState(s => ({ ...s, brandGuide: nextGuide }));
          try { localStorage.setItem('brandGuide', JSON.stringify(nextGuide)); } catch {}
          showToast('Added font pairing to guide');
        }} onRemoveFontPairing={(p)=>{
          if (!state.brandGuide) return;
          const base = state.brandGuide;
          const existing = base.fontPairings || [];
          const nextList = existing.filter(x => !(x.heading === p.heading && x.body === p.body));
          const nextGuide = { ...base, fontPairings: nextList } as BrandGuide;
          setState(s => ({ ...s, brandGuide: nextGuide }));
          try { localStorage.setItem('brandGuide', JSON.stringify(nextGuide)); } catch {}
          showToast('Removed font pairing from guide');
        }} />;
      default:
        return null;
    }
  })();

  return (
    <div className="md:flex min-h-screen">
      <Sidebar activeView={state.view} setView={setView} isGuideGenerated={state.isGenerated} />
      <main className="flex-1 p-6">{content}</main>
    </div>
  );
};

export default App;
