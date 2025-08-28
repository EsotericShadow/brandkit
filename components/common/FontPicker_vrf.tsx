import React from 'react';
import { assetsFor } from '../../data/fonts_vrf';

interface Props {
  label: string;
  value: string;
  onChange: (family: string) => void;
  options: string[];
  placeholder?: string;
  sampleText?: string;
}

const VISIBLE_IMPORT_LIMIT = 12; // limit @import tags for performance

const FontPicker: React.FC<Props> = ({ label, value, onChange, options, placeholder = 'Search or type a family name…', sampleText = 'The quick brown fox jumps over the lazy dog' }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const filtered = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return options;
    return options.filter(o => o.toLowerCase().includes(term));
  }, [query, options]);

  const extraOption = React.useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    if (options.some(o => o.toLowerCase() === q.toLowerCase())) return null;
    return q; // allow selecting a non-listed Google Fonts family
  }, [query, options]);

  const visibleForImport = React.useMemo(() => {
    const top = filtered.slice(0, VISIBLE_IMPORT_LIMIT);
    return extraOption ? [extraOption, ...top] : top;
  }, [filtered, extraOption]);

  const importCss = React.useMemo(() => {
    return visibleForImport.map(f => assetsFor(f, 'heading').import).join('\n');
  }, [visibleForImport]);

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 text-sm"
          aria-label={`${label} search`}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800 text-sm"
          aria-label={`${label} toggle list`}
        >
          {open ? 'Close' : 'Browse'}
        </button>
      </div>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Selected: {value || 'None'}</p>

      {open && (
        <div className="absolute z-20 mt-2 w-full max-h-72 overflow-auto rounded-md border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow">
          <style>{importCss}</style>
          {extraOption && (
            <button
              className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              onClick={() => { onChange(extraOption); setOpen(false); setQuery(''); }}
            >
              Use "{extraOption}" (Google Fonts)
            </button>
          )}
          {filtered.length === 0 && !extraOption && (
            <div className="px-3 py-2 text-sm text-neutral-600 dark:text-neutral-400">No matches. Type a Google Fonts family name to use it.</div>
          )}
          {filtered.map((fam) => {
            const css = assetsFor(fam, 'heading').css;
            return (
              <button
                key={fam}
                className="w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={() => { onChange(fam); setOpen(false); setQuery(''); }}
              >
                <div className="text-xs text-neutral-500 dark:text-neutral-400">{fam}</div>
                <div style={{ fontFamily: css, fontWeight: 800 }} className="text-sm truncate">{sampleText}</div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FontPicker;

