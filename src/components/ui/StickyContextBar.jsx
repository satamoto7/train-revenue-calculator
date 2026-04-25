import React from 'react';

const StickyContextBar = ({ className = '', children }) => (
  <section
    className={`sticky top-3 z-20 rounded-3xl border border-border-subtle bg-surface-elevated/95 shadow-ui backdrop-blur ${className}`}
  >
    {children}
  </section>
);

export default StickyContextBar;
