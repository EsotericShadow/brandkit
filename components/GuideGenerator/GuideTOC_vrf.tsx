import React from 'react';

interface GuideTOCProps {
  sections: Array<{ id: string; title: string }>;
}

const GuideTOC: React.FC<GuideTOCProps> = ({ sections }) => {
  if (!sections?.length) return null;
  return (
    <nav aria-label="Guide sections" className="space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">On this page</div>
      <ul className="space-y-1">
        {sections.map(s => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="block text-sm text-neutral-700 dark:text-neutral-300 hover:underline">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default GuideTOC;

