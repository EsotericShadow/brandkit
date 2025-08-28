import React from 'react';

const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}> = ({ children, onClick, variant = 'primary', size = 'md', disabled = false, className = '', type = 'button' }) => {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-950 disabled:opacity-50 disabled:pointer-events-none';
  const variantStyles = {
    primary: 'bg-neutral-900 text-white hover:bg-neutral-700 focus:ring-neutral-500',
    secondary: 'bg-neutral-200 text-neutral-800 hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 focus:ring-neutral-500',
    ghost: 'hover:bg-neutral-200 dark:hover:bg-neutral-800 focus:ring-neutral-500',
  } as const;
  const sizeStyles = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-base', lg: 'px-6 py-3 text-lg' } as const;

  // Dynamic style for primary variant using CSS variables set at runtime
  const dynamicStyle = variant === 'primary'
    ? { backgroundColor: 'var(--brand-primary, #171717)', color: 'var(--brand-on-primary, #ffffff)' } as React.CSSProperties
    : undefined;

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} style={dynamicStyle}>
      {children}
    </button>
  );
};

export default Button;

