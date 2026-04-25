import React from 'react';

const toneClasses = {
  default: 'text-text-primary',
  success: 'text-status-success',
  warning: 'text-status-warning',
  info: 'text-brand-primary',
};

const MetricCard = ({ label, value, hint, tone = 'default', className = '' }) => (
  <div className={`ui-kpi ${className}`}>
    <p className="text-xs font-medium uppercase tracking-[0.18em] text-text-muted">{label}</p>
    <p className={`mt-2 text-2xl font-semibold ${toneClasses[tone] || toneClasses.default}`}>
      {value}
    </p>
    {hint ? <p className="mt-1 text-sm text-text-secondary">{hint}</p> : null}
  </div>
);

export default MetricCard;
