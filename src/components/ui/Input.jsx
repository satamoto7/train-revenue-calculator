import React from 'react';

const Input = ({ className = '', ...props }) => (
  <input
    {...props}
    className={`rounded-md border border-gray-300 px-2 py-1.5 text-sm shadow-sm focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-soft ${className}`}
  />
);

export default Input;
