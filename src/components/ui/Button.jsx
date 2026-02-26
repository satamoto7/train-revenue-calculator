import React from 'react';

const buttonVariants = {
  primary: 'bg-brand-primary text-white hover:bg-brand-primary-strong',
  secondary: 'bg-surface-muted text-text-primary hover:bg-brand-soft',
  danger: 'bg-status-danger text-white hover:brightness-95',
  ghost: 'bg-transparent text-brand-primary hover:bg-brand-accent-soft',
};

const buttonSizes = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

const Button = ({ variant = 'primary', size = 'md', className = '', ...props }) => (
  <button
    {...props}
    className={`rounded-lg border border-transparent font-semibold shadow-ui transition-colors duration-150 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
  />
);

export default Button;
