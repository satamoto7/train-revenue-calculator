import React from 'react';

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`min-h-11 rounded-lg border border-border-subtle bg-surface-elevated px-3 py-2.5 text-sm text-text-primary shadow-sm transition focus:border-brand-primary focus:outline-none focus:ring-4 focus:ring-brand-soft disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-muted ${className}`}
  />
);

export default Input;
