import React from 'react';

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`rounded-md border border-border-subtle bg-surface-elevated px-2 py-1.5 text-sm text-text-primary shadow-sm focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent-soft ${className}`}
  />
);

export default Input;
