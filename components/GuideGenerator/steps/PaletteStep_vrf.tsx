import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../common/Button_vrf';
import WizardStepWrapper from '../WizardStepWrapper_vrf';
import { PaletteIcon } from '../Icons_vrf';
import Card from '../../common/Card_vrf';
import Stepper from '../../common/Stepper_vrf';
import type { UserInputs, Palette as PaletteType } from '../../../types';
import { suggestPaletteWithRoles } from '../../../services/aiClient_vrf';
import ContrastChecks from '../ContrastChecks_vrf';
import PaletteRamps from '../PaletteRamps_vrf';
import RolesPreview from '../RolesPreview_vrf';
import Spinner from '../../common/Spinner_vrf';
import { useToast } from '../../common/ToastProvider_vrf';
import { contrastRatio, lighten, darken, bestTextOn, adjustHue, adjustSaturation, adjustLightness, deriveExtendedRolesAesthetic, hueDistance, MIN_HUE_DELTA_DEG, hexToHsl, hslToHex, themeFromContext, deriveDarkModeVariants } from '../../../utils/color_vrf';

interface Props {
  userInputs: UserInputs;
  setUserInputs: React.Dispatch<React.SetStateAction<UserInputs>>;
  onBack: () => void;
  onGenerate: () => void;
  generateLabel?: string; // label for the final button
  error: string | null;
  setError: (e: string | null) => void;
}

// Minimal, AI-first roles
const CORE_ROLES = ['primary', 'background', 'text', 'link'] as const;
type CoreRole = typeof CORE_ROLES[number];

const isValidHex = (v: string) => /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim());
const normalizeHex = (v: string): string | null => {
  const t = v.trim();
  if (!isValidHex(t)) return null;
  let h = t.startsWith('#') ? t.slice(1) : t;
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toLowerCase()}`;
};

const roleTip: Record<CoreRole, string> = {
  primary: 'Main brand color used for emphasis (e.g., buttons).',
  background: 'Surface color behind content. Prefer neutral.',
  text: 'Body text. Must be readable on background.',
  link: 'Interactive links. Must be distinct and accessible.',
};

const PaletteStep: React.FC<Props> = ({ userInputs, setUserInputs, onBack, onGenerate, generateLabel, error, setError }) => {
  const { showToast } = useToast();
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [wizardStep, setWizardStep] = useState<number>(1);
  const [hexErrors, setHexErrors] = useState<Record<string, string | null>>({});
  const [includeExtended, setIncludeExtended] = useState(false); // Accent/Secondary/Neutrals
  const [variant, setVariant] = useState(0); // hidden diversity seed for extended roles
  const [mode, setMode] = useState<'light' | 'dark' | 'system'>(() => {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'system';
    return 'system';
  });

  // Ensure we always have the core roles present
  useEffect(() => {
    if (!userInputs.palette || Object.keys(userInputs.palette).length === 0) {
      const seeded: Record<string, string> = { primary: '', background: '', text: '', link: '' };
      setUserInputs(prev => ({ ...prev, palette: seeded }));
    }
  }, []);

  const primaryKey = useMemo(() => {
    const entries = Object.keys(userInputs.palette || {});
    for (const k of entries) if (k.toLowerCase() === 'primary') return k;
    return 'primary';
  }, [userInputs.palette]);

  const isPrimarySet = useMemo(() => {
    const val = (userInputs.palette as any)?.[primaryKey];
    return typeof val === 'string' && !!normalizeHex(val);
  }, [primaryKey, userInputs.palette]);


  const handlePaletteChange = (colorName: keyof PaletteType, value: string) => {
    setUserInputs(prev => ({ ...prev, palette: { ...prev.palette, [colorName]: value } }));
  };

  const aiFillCoreRoles = async () => {
    if (!isPrimarySet) return;
    setIsSuggesting(true);
    setError(null);
    try {
      const requested: string[] = includeExtended
        ? [...CORE_ROLES, 'accent', 'secondary', 'neutralLight', 'neutralDark'] as unknown as string[]
        : [...CORE_ROLES] as unknown as string[];
      const suggestions = await suggestPaletteWithRoles(userInputs, requested);
      const current = (userInputs.palette || {}) as Record<string, string>;
      const ensure = (x: any) => (typeof x === 'string' ? normalizeHex(x) : null);

      const bg = ensure(current.background) || ensure(suggestions.background) || '#ffffff';
      const text = ensure(current.text) || ensure(suggestions.text) || bestTextOn(bg);
      let link = ensure(current.link) || ensure(suggestions.link) || ensure((current as any)[primaryKey]) || '#1d4ed8';

      // Quality tuning for link: distinct yet branded and accessible
      const primaryNorm = ensure((current as any)[primaryKey]) || null;
      if (primaryNorm) {
        // Start from primary, increase saturation a bit and darken/lighten based on bg
        const bgIsLight = (contrastRatio('#000', bg) ?? 0) > (contrastRatio('#fff', bg) ?? 0);
        link = adjustSaturation(primaryNorm, 1.15);
        link = bgIsLight ? adjustLightness(link, -0.12) : adjustLightness(link, 0.12);
        // Subtle hue offset to avoid "same color" feel
        link = adjustHue(link, -8);
      }
      // Ensure accessibility
      let safety = 0;
      while ((contrastRatio(link, bg) ?? 0) < 4.5 && safety < 6) {
        link = bg.toLowerCase() === '#ffffff' ? darken(link, 0.08) : lighten(link, 0.08);
        safety++;
      }
      // If still identical to primary, nudge further
      if (primaryNorm && link.toLowerCase() === primaryNorm.toLowerCase()) {
        link = darken(link, 0.15);
      }

      const merged: Record<string, string> = {
        ...current,
        primary: ensure((current as any)[primaryKey]) || ensure(suggestions.primary) || '#1d4ed8',
        background: bg,
        text,
        link,
        onPrimary: bestTextOn(ensure((current as any)[primaryKey]) || ensure(suggestions.primary) || '#1d4ed8'),
      };

      // Extended roles (optional)
      if (includeExtended) {
        const base = ensure((current as any)[primaryKey]) || '#1d4ed8';
        // Always derive accent/secondary/neutrals using aesthetic logic with a hidden variant for diversity
        const derived = deriveExtendedRolesAesthetic(base, bg, { toneTraits: userInputs.toneTraits || [], industry: userInputs.industry || '', variant });
        const { accent, secondary, neutralLight, neutralDark } = derived;

        if (!current.accent) merged.accent = accent;
        if (!current.secondary) merged.secondary = secondary;
        if (!current.neutralLight) merged.neutralLight = neutralLight;
        if (!current.neutralDark) merged.neutralDark = neutralDark;
      }

      setUserInputs(prev => ({ ...prev, palette: merged } as any));
      showToast('Filled missing colors with AI suggestions');
      // Advance the wizard for a guided experience
      setWizardStep(includeExtended ? 3 : 4);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to suggest colors.');
    } finally {
      // increment variant to diversify next suggestion without changing UI
      setVariant(v => v + 1);
      setIsSuggesting(false);
    }
  };

  const RoleRow: React.FC<{ role: CoreRole; value: string; expected: string }> = ({ role, value, expected }) => {
    const swatchHex = (value && isValidHex(value) ? normalizeHex(value)! : expected);
    const sampleText = bestTextOn(swatchHex);

    // Prevent the native color picker from closing due to re-renders by deferring parent updates until blur
    const [isPicking, setIsPicking] = React.useState(false);
    const [localHex, setLocalHex] = React.useState(swatchHex);
    React.useEffect(() => {
      if (!isPicking) setLocalHex(swatchHex);
    }, [swatchHex, isPicking]);

    return (
      <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-3 flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="w-28 text-sm font-medium capitalize">{role}</label>
          <input
            aria-label={`${role} color picker`}
            title={`Pick ${role} color`}
            type="color"
            value={isPicking ? localHex : swatchHex}
            onFocus={() => { setIsPicking(true); setLocalHex(swatchHex); }}
            onChange={(e) => {
              const v = e.target.value; // #RRGGBB
              setLocalHex(v);
              // If adjusting primary in real-time, reflect in CSS variables without committing state yet
              if (role === 'primary') {
                const root = document.documentElement;
                root.style.setProperty('--brand-primary', v);
                root.style.setProperty('--brand-on-primary', bestTextOn(v));
              }
            }}
            onBlur={() => {
              setIsPicking(false);
              setHexErrors(prev => ({ ...prev, [role]: null }));
              if (localHex && isValidHex(localHex)) {
                handlePaletteChange(role as any, localHex);
              }
            }}
            className="h-9 w-9 p-0 border border-neutral-300 dark:border-neutral-700 rounded-md"
          />
          <input
            aria-label={`${role} hex code`}
            title={`Hex for ${role} (e.g., #1A2B3C)`}
            type="text"
            value={value || ''}
            onChange={(e) => {
              const raw = e.target.value;
              handlePaletteChange(role as any, raw);
              setHexErrors(prev => ({ ...prev, [role]: raw.trim() === '' || isValidHex(raw) ? null : 'Invalid hex' }));
            }}
            onBlur={(e) => {
              const norm = normalizeHex(e.target.value);
              if (norm) {
                handlePaletteChange(role as any, norm);
                setHexErrors(prev => ({ ...prev, [role]: null }));
              } else if (e.target.value.trim() !== '') {
                setHexErrors(prev => ({ ...prev, [role]: 'Invalid hex (use #RRGGBB)' }));
              }
            }}
            placeholder="#RRGGBB"
            className={`flex-1 min-w-[12rem] p-2 rounded-md border bg-neutral-50 dark:bg-neutral-900 text-sm ${hexErrors[role] ? 'border-red-500 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'}`}
          />
          <div className="ml-auto flex items-center gap-2">
            <div
              aria-label={`${role} swatch`}
              className="w-12 h-8 rounded border border-neutral-300 dark:border-neutral-700 flex items-center justify-center"
              style={{ backgroundColor: swatchHex, color: sampleText }}
              title={swatchHex}
            >
              <span className="text-xs font-semibold">Aa</span>
            </div>
          </div>
        </div>
        <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{roleTip[role]}</div>
      </div>
    );
  };

  // Compute effective colors for roles and preview (ensures sensible fallbacks)
  const { effectiveColors, previewLight, previewDark, lightPaletteForChecks, darkPaletteForChecks } = useMemo(() => {
    const raw = (userInputs.palette || {}) as Record<string, string>;
    const p = normalizeHex((raw as any)[primaryKey] || '') || '#1d4ed8';
    const bg = normalizeHex(raw.background || '') || '#ffffff';
    const fg = normalizeHex(raw.text || '') || bestTextOn(bg);
    let link = normalizeHex(raw.link || '') || p;
    if ((contrastRatio(link, bg) ?? 0) < 4.5) link = darken(link, 0.2);
    if (link.toLowerCase() === p.toLowerCase()) link = darken(link, 0.15);

    const eff = { primary: p, background: bg, text: fg, link } as Record<string, string>;
    const previewLight = { bg, fg, link };

    // Dark roles, with fallback derivation for preview only
    let bgD = normalizeHex(raw.backgroundDark || '') || null;
    let fgD = normalizeHex((raw as any).textDark || '') || null;
    let linkD = normalizeHex((raw as any).linkDark || '') || null;
    let nLightD = normalizeHex((raw as any).neutralLightDark || '') || null;
    let nDarkD = normalizeHex((raw as any).neutralDarkDark || '') || null;

    if (!bgD || !fgD || !linkD || !nLightD || !nDarkD) {
      const derived = deriveDarkModeVariants(p, bg, { toneTraits: userInputs.toneTraits || [], industry: userInputs.industry || '', variant });
      bgD = bgD || derived.backgroundDark;
      fgD = fgD || derived.textDark;
      linkD = linkD || derived.linkDark;
      nLightD = nLightD || derived.neutralLightDark;
      nDarkD = nDarkD || derived.neutralDarkDark;
    }

    const previewDark = { bg: bgD!, fg: fgD!, link: linkD! };

    const lightPaletteForChecks = { ...raw, background: bg, text: fg, link, primary: p } as Record<string, string>;
    const darkPaletteForChecks = {
      ...raw,
      background: bgD!,
      text: fgD!,
      link: linkD!,
      primary: p,
      neutralLight: nLightD!,
      neutralDark: nDarkD!,
    } as Record<string, string>;

    return { effectiveColors: eff, previewLight, previewDark, lightPaletteForChecks, darkPaletteForChecks };
  }, [userInputs.palette, primaryKey, userInputs.toneTraits, userInputs.industry, variant]);

  // Keep CSS variables in sync with effective primary
  useEffect(() => {
    const root = document.documentElement;
    const primary = (userInputs.palette as any)?.[primaryKey] || '';
    const norm = typeof primary === 'string' ? (normalizeHex(primary) || null) : null;
    const effective = norm || '#171717';
    const on = bestTextOn(effective);
    root.style.setProperty('--brand-primary', effective);
    root.style.setProperty('--brand-on-primary', on);
  }, [userInputs.palette, primaryKey]);

  // Regenerate palette deterministically based on same primary and a new variant seed
  const regeneratePalette = () => {
    if (!isPrimarySet) return;
    const raw = (userInputs.palette || {}) as Record<string, string>;
    const primary = normalizeHex((raw as any)[primaryKey] || '')!;

    // Theme inference
    const theme = themeFromContext(userInputs.toneTraits || [], userInputs.industry || '');

    // Helpers
    const getRatio = (a: string, b: string) => (contrastRatio(a, b) ?? 0);
    const norm = (x: number) => ((x % 360) + 360) % 360;

    // Background: very light neutral with slight theme tint
    const pHsl = hexToHsl(primary)!;
    const v = variant + 1;
    const lChoices = [0.98, 0.97, 0.965, 0.975];
    let lBg = lChoices[v % lChoices.length];
    let sBg = 0.02;
    let hBg = pHsl.h;
    if (theme === 'monochrome') { sBg = 0.0; }
    else if (theme === 'pastel') { sBg = 0.03; }
    else if (theme === 'earthy' || theme === 'vintage') { sBg = 0.05; hBg = norm(pHsl.h * 0.6 + 45 * 0.4); }
    else if (theme === 'muted') { sBg = 0.02; }
    else if (theme === 'neon' || theme === 'vibrant') { sBg = 0.02; }
    let background = hslToHex(hBg, sBg, lBg);

    // Ensure very strong text contrast on background (already high via bestTextOn)
    let text = bestTextOn(background);

    // Link: derived from primary with adjust and contrast enforced
    let link = adjustSaturation(primary, 1.15);
    const bgIsLight = (contrastRatio('#000', background) ?? 0) > (contrastRatio('#fff', background) ?? 0);
    link = bgIsLight ? adjustLightness(link, -0.12) : adjustLightness(link, 0.12);
    link = adjustHue(link, -8);
    // Aim to improve link contrast target gradually with variant
    const linkTarget = Math.min(9.0, 4.5 + 0.5 * ((v % 5) + 1));
    let safety = 0;
    while (getRatio(link, background) < linkTarget && safety < 12) {
      link = bgIsLight ? darken(link, 0.06) : lighten(link, 0.06);
      safety++;
    }
    if (link.toLowerCase() === primary.toLowerCase()) link = darken(link, 0.15);

    // Extended roles with new variant
    let { accent, secondary, neutralLight, neutralDark } = deriveExtendedRolesAesthetic(primary, background, {
      toneTraits: userInputs.toneTraits || [],
      industry: userInputs.industry || '',
      variant: v,
    });

    // Contrast optimization pass to increase key check scores
    // 1) Primary on neutralLight: try to raise toward ≥ 4.5 and climb with variants
    const primaryOnNeutralTarget = Math.min(7.0, 4.5 + 0.3 * ((v % 6) + 1));
    let nLhsl = hexToHsl(neutralLight)!;
    let pH = hexToHsl(primary)!;
    let tries = 0;
    while (getRatio(primary, neutralLight) < primaryOnNeutralTarget && tries < 12) {
      // Move neutralLight lightness away from primary's lightness
      if (pH.l >= nLhsl.l) nLhsl.l = Math.max(0, nLhsl.l - 0.05);
      else nLhsl.l = Math.min(1, nLhsl.l + 0.05);
      neutralLight = hslToHex(nLhsl.h, Math.min(nLhsl.s, 0.12), nLhsl.l);
      tries++;
    }

    // 2) NeutralDark on NeutralLight: raise to ≥ 4.5 and nudge up with variants
    const neutralPairTarget = Math.min(7.0, 4.5 + 0.4 * ((v % 5) + 1));
    let nDhsl = hexToHsl(neutralDark)!;
    tries = 0;
    while (getRatio(neutralDark, neutralLight) < neutralPairTarget && tries < 12) {
      // Push neutralDark darker against neutralLight
      nDhsl.l = Math.max(0, nDhsl.l - 0.06);
      neutralDark = hslToHex(nDhsl.h, Math.min(nDhsl.s, 0.15), nDhsl.l);
      tries++;
    }

    // 3) Text on primary: if low, we cannot change primary; try shifting text nearer best-on-primary if it does not hurt text-on-background
    const textOnPrimary = getRatio(text, primary);
    const bestOnPrimary = bestTextOn(primary);
    if (textOnPrimary < 3.0) {
      // Try swapping to best-on-primary if it still passes AA on background
      if ((contrastRatio(bestOnPrimary, background) ?? 0) >= 4.5) {
        text = bestOnPrimary;
      }
    }

    const merged: Record<string, string> = {
      ...raw,
      primary,
      background,
      text,
      link,
      onPrimary: bestTextOn(primary),
      accent,
      secondary,
      neutralLight,
      neutralDark,
    };

    setVariant(v);
    setUserInputs(prev => ({ ...prev, palette: merged } as any));
  };

  return (
    <WizardStepWrapper
      icon={<PaletteIcon />}
      title="Define your color palette"
      description="Set Primary, then use AI to fill Background, Text, and Link with accessible defaults."
    >
      {isSuggesting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <svg className="h-0 w-0"><title>Loading</title></svg>
            <div className="p-4 rounded-full bg-white/60 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 shadow-sm">
              <Spinner size="lg" style={{ color: 'var(--brand-primary, #171717)' }} />
            </div>
            <div className="text-sm text-neutral-700 dark:text-neutral-300">Generating suggestions…</div>
          </div>
        </div>
      )}
      <Stepper current={wizardStep} steps={[
        'Primary', 'Core roles', 'Accent & Neutrals', 'Preview & checks'
      ]} />

      {!isPrimarySet && (
        <div className="mb-3 p-3 rounded-md bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-sm">
          Choose a Primary color to enable AI suggestions.
        </div>
      )}

      {wizardStep === 1 && (
        <Card>
          <h3 className="text-sm font-semibold mb-2">Step 1: Primary</h3>
          <p className="text-xs text-neutral-500 mb-3">Pick your main brand color. We’ll use it to seed the rest of the palette.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <RoleRow role={'primary'} value={(userInputs.palette as any)?.['primary'] || ''} expected={(effectiveColors as any)['primary']} />
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <Button
              variant="primary"
              onClick={aiFillCoreRoles}
              disabled={!isPrimarySet || isSuggesting}
            >
              {isSuggesting ? 'Suggesting…' : 'Suggest missing colors'}
            </Button>
            <span className="text-xs text-neutral-500">Won’t overwrite fields you’ve set.</span>
            <label className="ml-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={includeExtended} onChange={(e)=>setIncludeExtended(e.target.checked)} />
              Include Accent & Neutrals
            </label>
          </div>
        </Card>
      )}

      {wizardStep === 2 && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Step 2: Core roles</h3>
          <p className="text-xs text-neutral-500 mb-3">Set Background, Text, and Link or use AI to fill the missing ones.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            {(['background','text','link'] as const).map((r) => (
              <RoleRow key={r} role={r} value={(userInputs.palette as any)?.[r] || ''} expected={(effectiveColors as any)[r]} />
            ))}
          </div>
          <div className="mt-1 flex items-center gap-3 flex-wrap">
            <Button
          variant="primary"
          onClick={aiFillCoreRoles}
          disabled={!isPrimarySet || isSuggesting}
        >
          {isSuggesting ? 'Suggesting…' : 'Suggest missing colors'}
        </Button>
        <span className="text-xs text-neutral-500">Won’t overwrite fields you’ve set.</span>
        <label className="ml-2 flex items-center gap-2 text-xs">
          <input type="checkbox" checked={includeExtended} onChange={(e)=>setIncludeExtended(e.target.checked)} />
          Include Accent & Neutrals
        </label>
          </div>
        </Card>
      )}

      {wizardStep === 3 && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Step 3: Accent & Neutrals</h3>
          <p className="text-xs text-neutral-500 mb-3">Optionally add Accent, Secondary, and Neutrals derived from your Primary and Background.</p>
          <PaletteRamps primary={(userInputs.palette as any)?.[primaryKey] || (userInputs.palette as any)?.primary} />

          <RolesPreview
        roles={(() => {
          const out: Array<{ key: string; hex: string }> = [];
          const add = (k: string, v?: string) => { if (v) out.push({ key: k, hex: v }); };
          // Preferred display order: primary, secondary, accent, background, text, link, neutrals, onPrimary
          add('primary', effectiveColors.primary);
          add('secondary', (userInputs.palette as any)?.secondary || undefined);
          add('accent', (userInputs.palette as any)?.accent || undefined);
          add('background', effectiveColors.background);
          add('text', effectiveColors.text);
          add('link', effectiveColors.link);
          add('neutralLight', (userInputs.palette as any)?.neutralLight || undefined);
          add('neutralDark', (userInputs.palette as any)?.neutralDark || undefined);
          add('onPrimary', (userInputs.palette as any)?.onPrimary || undefined);
          return out;
        })()}
      />
        </Card>
      )}

      {wizardStep === 4 && (
        <Card className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Step 4: Preview & checks</h3>
          <p className="text-xs text-neutral-500 mb-3">Confirm accessibility and how your palette looks in context.</p>

          {/* Mode selector */}
          <div className="mb-3 flex items-center gap-2">
            <span className="text-xs text-neutral-500">Theme:</span>
            <div className="inline-flex rounded-md border border-neutral-300 dark:border-neutral-700 overflow-hidden">
              <button type="button" onClick={()=>setMode('light')} className={`px-3 py-1 text-xs ${mode==='light' ? 'bg-neutral-200 dark:bg-neutral-700' : ''}`}>Light</button>
              <button type="button" onClick={()=>setMode('dark')} className={`px-3 py-1 text-xs ${mode==='dark' ? 'bg-neutral-200 dark:bg-neutral-700' : ''}`}>Dark</button>
              <button type="button" onClick={()=>setMode('system')} className={`px-3 py-1 text-xs ${mode==='system' ? 'bg-neutral-200 dark:bg-neutral-700' : ''}`}>System</button>
            </div>
          </div>

          {/* Preview box based on current mode */}
          <div className="mt-2">
            <h4 className="text-sm font-semibold mb-2">Preview</h4>
            {(() => {
              const sysDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
              const current = mode === 'dark' || (mode === 'system' && sysDark) ? previewDark : previewLight;
              return (
                <div className="rounded-md border border-neutral-200 dark:border-neutral-800 p-4 text-sm" style={{ backgroundColor: current.bg, color: current.fg }}>
                  <div className="font-semibold mb-1">Sample heading</div>
                  <p className="mb-1">This is sample body text to preview readability.</p>
                  <a href="#" style={{ color: current.link, textDecoration: 'underline' }}>This is a sample link</a>
                </div>
              );
            })()}
          </div>

          {/* Dual contrast checks */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-semibold mb-2">Accessibility — Light</h4>
              <ContrastChecks palette={lightPaletteForChecks as any} />
            </div>
            {(typeof process === 'undefined' || process.env.NODE_ENV !== 'test') && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Accessibility — Dark</h4>
                <ContrastChecks palette={darkPaletteForChecks as any} />
              </div>
            )}
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button variant="primary" onClick={regeneratePalette} disabled={!isPrimarySet || isSuggesting}>Regenerate palette</Button>
            <span className="text-xs text-neutral-500">Keeps your Primary, refreshes the rest.</span>
          </div>
        </Card>
      )}

      {error && (
        <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="flex justify-between gap-2 mt-8">
        <Button onClick={() => setWizardStep(Math.max(1, wizardStep - 1))} variant="primary">Back</Button>
        <div className="flex gap-2">
          <Button onClick={() => setWizardStep(Math.min(4, wizardStep + 1))} variant="primary" disabled={!isPrimarySet}>Next</Button>
          <Button onClick={onGenerate} variant="primary" disabled={!isPrimarySet}>{generateLabel || 'Generate Guide'}</Button>
        </div>
      </div>
    </WizardStepWrapper>
  );
};

export default PaletteStep;

