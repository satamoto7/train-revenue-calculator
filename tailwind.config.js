/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#27445D',
          'primary-strong': '#1E3447',
          soft: '#EEF2F6',
          accent: '#B68A3D',
          'accent-soft': '#F7F2E8',
        },
        surface: {
          base: '#F9FAFB',
          muted: '#F3F4F6',
          elevated: '#FFFFFF',
        },
        text: {
          primary: '#1F2937',
          secondary: '#475467',
          muted: '#667085',
        },
        border: {
          subtle: '#E5E7EB',
          strong: '#D0D5DD',
        },
        status: {
          success: '#1F7A52',
          warning: '#9A6B16',
          danger: '#C2413B',
          info: '#2F5D8A',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
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
        ui: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px rgba(16, 24, 40, 0.06)',
        'ui-lg': '0 2px 4px rgba(16, 24, 40, 0.04), 0 16px 32px rgba(16, 24, 40, 0.08)',
      },
    },
  },
  plugins: [],
};
