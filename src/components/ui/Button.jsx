import React from 'react';

const buttonVariants = {
  primary:
    'border-brand-primary bg-brand-primary text-white hover:border-brand-primary-strong hover:bg-brand-primary-strong',
  secondary:
    'border-border-subtle bg-surface-elevated text-text-primary hover:border-brand-primary/30 hover:bg-brand-soft/70',
  danger: 'border-status-danger/20 bg-surface-elevated text-status-danger hover:bg-status-danger/5',
  dangerSolid: 'border-status-danger bg-status-danger text-white hover:brightness-95',
  ghost:
    'border-transparent bg-transparent text-text-secondary shadow-none hover:bg-surface-muted hover:text-brand-primary',
};

const buttonSizes = {
  md: 'min-h-11 px-4 py-2.5 text-sm',
  lg: 'min-h-12 px-6 py-3 text-base',
};

const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => (
  <button
    {...props}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border font-semibold shadow-ui transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-soft disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-muted disabled:text-text-muted disabled:shadow-none ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
  />
);

export default Button;
