import React from 'react';
import { assessContrast, bestTextOn } from '../../utils/color_vrf';

interface Props {
  palette: Record<string, string>;
}

const ContrastChecks: React.FC<Props> = ({ palette }) => {
  const p: any = palette;
  type Pair = { label: string; fg?: string; bg?: string };
  const onPrimary = p.onPrimary || (p.primary ? bestTextOn(p.primary) : undefined);
  // Keep only the most important comparisons. Others (hover/visited/success/warning/danger) are omitted.
  const pairs: Pair[] = [
    { label: 'Text on background', fg: p.text, bg: p.background },
    { label: 'Link on background', fg: p.link, bg: p.background },
    { label: 'Text on primary', fg: onPrimary, bg: p.primary },
  ];
  if (p.neutralLight && p.neutralDark) {
    pairs.push({ label: 'Neutral dark on neutral light', fg: p.neutralDark, bg: p.neutralLight });
  }
  if (p.primary && p.neutralLight) {
    pairs.push({ label: 'Primary on neutral light', fg: p.primary, bg: p.neutralLight });
  }
  let prepared = pairs.filter(x => x.fg && x.bg) as {label:string;fg:string;bg:string}[];
  // Limit to top 5 important rows (we already curated to essentials; neutrals add up to 5)
  prepared = prepared.slice(0, 5);
  return (
    <div data-testid="contrast-checks" className="space-y-2 text-xs w-full overflow-x-auto">
      {prepared.length === 0 ? (
        <p className="text-neutral-500">Add background and text (and optionally link/primary) to check contrast.</p>
      ) : (
        prepared.map((pair, i) => {
          const res = assessContrast(pair.fg, pair.bg);
          const ratio = res.ratio?.toFixed(2) ?? 'N/A';
          return (
            <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
              <span className="flex items-center gap-2 min-w-[140px] md:min-w-[220px] shrink-0">
                <span className="inline-flex items-center gap-1">
                  <span className="inline-block w-3.5 h-3.5 rounded border border-neutral-300 dark:border-neutral-700" style={{ backgroundColor: pair.fg }} title={`FG ${pair.fg}`}></span>
                  <span className="inline-block w-3.5 h-3.5 rounded border border-neutral-300 dark:border-neutral-700" style={{ backgroundColor: pair.bg }} title={`BG ${pair.bg}`}></span>
                </span>
                <span className="truncate max-w-[50vw] md:max-w-none">{pair.label}</span>
              </span>
              <span className="font-mono shrink-0">{ratio}:1</span>
              <span className={`px-1.5 py-0.5 rounded shrink-0 ${res.AA ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>AA</span>
              <span className={`px-1.5 py-0.5 rounded shrink-0 ${res.AAA ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>AAA</span>
              <span className={`px-1.5 py-0.5 rounded shrink-0 ${res.AALarge ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>AA Large</span>
              <span className={`px-1.5 py-0.5 rounded shrink-0 ${res.AAALarge ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>AAA Large</span>
            </div>
          );
        })
      )}
    </div>
  );
};

export default ContrastChecks;

