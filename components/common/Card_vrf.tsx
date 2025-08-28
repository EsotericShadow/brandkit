import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    description?: string;
    icon?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className = '', title, description, icon }) => {
    return (
        <div className={`bg-white dark:bg-neutral-900 rounded-lg shadow-sm border border-neutral-200 dark:border-neutral-800 p-6 ${className}`}>
            {(title || description || icon) && (
                 <div className="flex items-start gap-4 mb-4">
                    {icon && <div className="text-neutral-500">{icon}</div>}
                    <div>
                        {title && <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{title}</h3>}
                        {description && <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{description}</p>}
                    </div>
                </div>
            )}
            {children}
        </div>
    );
};

export default Card;

