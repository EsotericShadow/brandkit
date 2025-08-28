import React, { useMemo } from 'react';
import type { Palette } from '../../types';
import { bestTextOn, normalizeHex, adjustSaturation, adjustLightness, adjustHue, darken, contrastRatio, deriveExtendedRolesAesthetic } from '../../utils/color_vrf';

interface Props {
  palette: Palette;
  children: React.ReactNode;
}

// Computes effective palette values with sensible fallbacks
function computeEffective(palette: Palette) {
  const primary = normalizeHex(palette.primary || '') || '#1d4ed8';
  const background = normalizeHex(palette.background || '') || '#ffffff';
  let text = normalizeHex(palette.text || '') || bestTextOn(background);

  let link = normalizeHex(palette.link || '') || undefined;
  if (!link) {
    // derive from primary, ensure accessible on background
    const bgIsLight = (contrastRatio('#000', background) ?? 0) > (contrastRatio('#fff', background) ?? 0);
    let l = adjustSaturation(primary, 1.15);
    l = bgIsLight ? adjustLightness(l, -0.12) : adjustLightness(l, 0.12);
    l = adjustHue(l, -8);
    let safety = 0;
    while ((contrastRatio(l, background) ?? 0) < 4.5 && safety < 10) {
      l = bgIsLight ? darken(l, 0.08) : adjustLightness(l, 0.08);
      safety++;
    }
    link = l;
  }

  // neutrals and secondaries, derive if missing
  let neutralLight = normalizeHex(palette.neutralLight || '') || undefined;
  let neutralDark = normalizeHex(palette.neutralDark || '') || undefined;

  if (!neutralLight || !neutralDark) {
    const derived = deriveExtendedRolesAesthetic(primary, background, { toneTraits: [], industry: '' });
    neutralLight = neutralLight || derived.neutralLight;
    neutralDark = neutralDark || derived.neutralDark;
  }

  return { primary, background, text, link, neutralLight, neutralDark, onPrimary: bestTextOn(primary) };
}

const BrandThemeProvider: React.FC<Props> = ({ palette, children }) => {
  const eff = useMemo(() => computeEffective(palette || {}), [palette]);

  const style: React.CSSProperties = {
    // expose variables
    ['--brand-primary' as any]: eff.primary,
    ['--brand-on-primary' as any]: eff.onPrimary,
    ['--brand-background' as any]: eff.background,
    ['--brand-text' as any]: eff.text,
    ['--brand-link' as any]: eff.link,
    ['--brand-neutral-light' as any]: eff.neutralLight,
    ['--brand-neutral-dark' as any]: eff.neutralDark,
    // apply to container
    backgroundColor: 'var(--brand-background)',
    color: 'var(--brand-text)',
  };

  return (
    <div className="brand-theme" style={style}>
      {/* Scoped link color and selection styles to the wizard container */}
      <style>
        {`
          .brand-theme a { color: var(--brand-link); }
          .brand-theme ::selection { background: var(--brand-primary); color: var(--brand-on-primary); }
        `}
      </style>
      {children}
    </div>
  );
};

export default BrandThemeProvider;

