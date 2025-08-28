import React from 'react';

interface RolesPreviewProps {
  roles: Array<{ key: string; hex: string }>; // already normalized #rrggbb
}

const RolesPreview: React.FC<RolesPreviewProps> = ({ roles }) => {
  if (!roles.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold mb-2">Roles palette</h4>
      <div className="flex flex-wrap gap-3">
        {roles.map(({ key, hex }) => (
          <div key={key} className="flex items-center gap-2 px-2 py-1 rounded-md border border-neutral-300 dark:border-neutral-700">
            <span className="inline-block w-4 h-4 rounded-sm border border-neutral-300 dark:border-neutral-600" style={{ backgroundColor: hex }} />
            <span className="text-xs font-medium capitalize">{key}</span>
            <span className="text-xs text-neutral-500">{hex}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RolesPreview;

