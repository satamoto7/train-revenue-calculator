import React from 'react';
import {
  getCompanyColor,
  getCompanyDisplayName,
  getMarkerHighlightStyle,
  normalizeHexColor,
} from '../../lib/labels';

const CompanyColorPreview = ({ company, className = '' }) => {
  const color = getCompanyColor(company);
  if (!normalizeHexColor(color)) return null;

  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-semibold tracking-wide ${className}`}
      style={getMarkerHighlightStyle(color)}
      aria-label={`${getCompanyDisplayName(company)} のテンプレート色プレビュー`}
      title={color}
    >
      {getCompanyDisplayName(company)}
    </span>
  );
};

export default CompanyColorPreview;
