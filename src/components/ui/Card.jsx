import React from 'react';

const Card = ({ className = '', children }) => (
  <section className={`ui-panel p-5 sm:p-6 ${className}`}>{children}</section>
);

export default Card;
