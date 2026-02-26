import React from 'react';

const sizeClasses = {
  page: 'text-3xl font-bold font-serif tracking-wide text-text-primary',
  section: 'text-2xl font-semibold font-serif text-text-primary',
  subsection: 'text-xl font-semibold font-serif text-text-primary',
};

const SectionHeader = ({ as: Tag = 'h2', size = 'section', className = '', children }) => (
  <Tag className={`${sizeClasses[size]} ${className}`}>{children}</Tag>
);

export default SectionHeader;
