import React from 'react';
import { useToast } from '../common/ToastProvider_vrf';

const isValidHex = (v: string) => /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(v.trim());
const normalizeHex = (v: string): string | null => {
  const t = v.trim();
  if (!isValidHex(t)) return null;
  let h = t.startsWith('#') ? t.slice(1) : t;
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return `#${h.toUpperCase()}`;
};

const ColorSwatch: React.FC<{ name: string; hex: string; isEditable?: boolean; onChange?: (hex: string) => void }> = ({ name, hex, isEditable = false, onChange }) => {
  const [err, setErr] = React.useState<string | null>(null);
  const { showToast } = useToast();
  const label = name.replace(/([A-Z])/g, ' $1').trim();
  const safeHex = typeof hex === 'string' ? hex : '';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-24 h-24 rounded-lg shadow-inner border border-neutral-200 dark:border-neutral-800 relative" style={{ backgroundColor: isValidHex(safeHex) ? normalizeHex(safeHex)! : '#000000' }}>
        {isEditable && (
          <input aria-label={`${label} color picker`} type="color" value={(isValidHex(safeHex) ? normalizeHex(safeHex)! : '#000000')} onChange={e => { setErr(null); onChange?.(e.target.value); }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        )}
      </div>
      <div className="text-center">
        <p className="font-semibold capitalize text-neutral-800 dark:text-neutral-200">{label}</p>
        {isEditable ? (
          <>
            <div className="flex items-center gap-2 justify-center mt-1">
              <input
                aria-label={`${label} hex code`}
                type="text"
                value={safeHex}
                onChange={e => { const v = e.target.value; onChange?.(v); setErr(v.trim() === '' || isValidHex(v) ? null : 'Invalid hex'); }}
                onBlur={e => { const norm = normalizeHex(e.target.value); if (norm) { onChange?.(norm); setErr(null); } else if (e.target.value.trim() !== '') { setErr('Invalid hex (use #RRGGBB)'); } }}
                className={`w-28 p-1 text-center text-sm rounded-md bg-neutral-100 dark:bg-neutral-800 border ${err ? 'border-red-500 dark:border-red-600' : 'border-neutral-300 dark:border-neutral-700'}`}
                placeholder="#RRGGBB"
              />
              <button
                onClick={() => { const norm = normalizeHex(safeHex); if (norm) { navigator.clipboard.writeText(norm); showToast(`Copied ${norm}`); } }}
                className="text-xs underline text-neutral-600 dark:text-neutral-300"
              >Copy</button>
            </div>
            {err && <div className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">{err}</div>}
          </>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 uppercase font-mono">{safeHex}</p>
        )}
      </div>
    </div>
  );
};

export default ColorSwatch;

