import React from 'react';

const buttonVariants = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary-strong',
  secondary: 'bg-surface-muted text-text-primary hover:bg-slate-300',
  danger: 'bg-status-danger text-white hover:bg-rose-700',
  ghost: 'bg-transparent text-brand-primary hover:bg-brand-soft',
};

const buttonSizes = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => (
  <button
    {...props}
    className={`rounded-lg font-semibold shadow-ui transition-colors duration-150 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
  />
);

export default Button;
