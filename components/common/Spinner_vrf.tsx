import React from 'react';

interface SpinnerProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
    style?: React.CSSProperties;
}

const Spinner: React.FC<SpinnerProps> = ({ className, size = 'md', style }) => {
    const sizeClasses = {
        sm: 'h-5 w-5',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    } as const;
    return (
        <svg
            className={`animate-spin ${sizeClasses[size]} text-neutral-900 dark:text-neutral-100 ${className}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            style={style}
        >
            <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
            ></circle>
            <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
        </svg>
    );
};

export default Spinner;

