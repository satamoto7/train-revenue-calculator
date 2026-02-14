/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#4f46e5',
          'primary-strong': '#4338ca',
          soft: '#e0e7ff',
        },
        surface: {
          muted: '#e2e8f0',
        },
        text: {
          primary: '#1e293b',
          secondary: '#475569',
          muted: '#64748b',
        },
        border: {
          subtle: '#cbd5e1',
        },
        status: {
          success: '#15803d',
          warning: '#b45309',
          danger: '#dc2626',
          info: '#2563eb',
        },
      },
      fontSize: {
        'ui-xs': ['0.75rem', { lineHeight: '1rem' }],
        'ui-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'ui-base': ['1rem', { lineHeight: '1.5rem' }],
        'ui-lg': ['1.125rem', { lineHeight: '1.75rem' }],
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      boxShadow: {
        ui: '0 2px 6px rgba(15, 23, 42, 0.12)',
        'ui-lg': '0 8px 24px rgba(15, 23, 42, 0.12)',
      },
    },
  },
  plugins: [],
};
