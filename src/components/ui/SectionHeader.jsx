import React from 'react';

const sizeClasses = {
  page: 'text-3xl font-bold',
  section: 'text-2xl font-semibold',
  subsection: 'text-xl font-semibold',
};

const SectionHeader = ({ as: Tag = 'h2', size = 'section', className = '', children }) => (
  <Tag className={`${sizeClasses[size]} ${className}`}>{children}</Tag>
);

export default SectionHeader;
