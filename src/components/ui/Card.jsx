import React from 'react';

const Card = ({ className = '', children }) => (
  <section
    className={`rounded-xl border border-border-subtle bg-white p-6 shadow-ui-lg ${className}`}
  >
    {children}
  </section>
);

export default Card;
