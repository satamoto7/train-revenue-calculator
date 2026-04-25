import React from 'react';

const sizeClasses = {
  page: 'text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl',
  section: 'text-xl font-semibold tracking-tight text-text-primary sm:text-2xl',
  subsection: 'text-lg font-semibold tracking-tight text-text-primary sm:text-xl',
};

const SectionHeader = ({ as: Tag = 'h2', size = 'section', className = '', children }) => (
  <Tag className={`${sizeClasses[size]} ${className}`}>{children}</Tag>
);

export default SectionHeader;
