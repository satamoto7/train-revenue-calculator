import React from 'react';

const sizeClasses = {
  page: 'text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl',
  section: 'text-2xl font-semibold tracking-tight text-text-primary',
  subsection: 'text-xl font-semibold tracking-tight text-text-primary',
};

const SectionHeader = ({ as: Tag = 'h2', size = 'section', className = '', children }) => (
  <Tag className={`${sizeClasses[size]} ${className}`}>{children}</Tag>
);

export default SectionHeader;
