import React from 'react';
import { lighten, darken, hexToHsl, hslToHex } from '../../utils/color_vrf';

interface Props {
  primary: string | undefined;
}

function isValidHex(v: string | undefined): v is string {
  return !!v && /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim());
}

function normalizeHex(v: string): string {
  let h = v.trim();
  h = h.startsWith('#') ? h.slice(1) : h;
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toLowerCase()}`;
}

const swatchClass = 'w-14 h-10 rounded-md border border-neutral-300 dark:border-neutral-700 flex items-center justify-center text-[10px] font-mono';

const PaletteRamps: React.FC<Props> = ({ primary }) => {
  const base = isValidHex(primary) ? normalizeHex(primary!) : '#1d4ed8';
  const hsl = hexToHsl(base) || { h: 210, s: 0.5, l: 0.5 };
  // Perceptually friendlier: lighten also lowers saturation a touch
  const tints = [0.6, 0.4, 0.2].map((t) => hslToHex(hsl.h, Math.max(0, hsl.s - t * 0.25), Math.min(1, hsl.l + t)));
  const shades = [0.12, 0.25, 0.38].map((t) => hslToHex(hsl.h, Math.min(1, hsl.s + t * 0.15), Math.max(0, hsl.l - t)));
  const steps = [
    ...tints,
    base,
    ...shades,
  ];

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">Palette preview</h4>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Derived tints and shades from your Primary. Click a swatch to copy its hex.</div>
      <div className="flex flex-wrap gap-2">
        {steps.map((hex, idx) => (
          <button
            key={idx}
            type="button"
            aria-label={`primary ramp ${idx}`}
            className={swatchClass}
            style={{ backgroundColor: hex, color: '#00000020' }}
            title={hex}
            onClick={() => navigator.clipboard.writeText(hex)}
          >
            {hex}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PaletteRamps;

