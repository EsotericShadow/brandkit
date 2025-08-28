import React from 'react';

interface EditableSectionProps {
    title: string;
    content: string;
    onChange: (newContent: string) => void;
    isEditing: boolean;
    rows?: number;
}

const EditableSection: React.FC<EditableSectionProps> = ({ title, content, onChange, isEditing, rows = 6 }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-2">{title}</label>
            {isEditing ? (
                 <textarea
                    value={content}
                    onChange={(e) => onChange(e.target.value)}
                    rows={rows}
                    className="w-full p-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-neutral-500 focus:border-neutral-500 transition"
                />
            ) : (
                <div className="p-3 bg-neutral-100 dark:bg-neutral-900 rounded-md whitespace-pre-wrap text-neutral-800 dark:text-neutral-200">
                    {content}
                </div>
            )}
        </div>
    );
};

export default EditableSection;

