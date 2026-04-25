/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#20518c',
          'primary-strong': '#173c68',
          soft: '#edf5ff',
          accent: '#4f7db8',
          'accent-soft': '#e8f0fb',
        },
        surface: {
          base: '#f5f7fb',
          muted: '#eef2f7',
          elevated: '#ffffff',
          inset: '#e7ecf4',
        },
        text: {
          primary: '#162235',
          secondary: '#506076',
          muted: '#708197',
        },
        border: {
          subtle: '#d8e0ea',
          strong: '#bcc8d7',
        },
        status: {
          success: '#16835f',
          warning: '#b07515',
          danger: '#cb4b4b',
          info: '#2a6aac',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', '"IBM Plex Sans JP"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
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
        ui: '0 1px 2px rgba(15, 23, 42, 0.03), 0 10px 24px rgba(15, 23, 42, 0.05)',
        'ui-lg': '0 8px 20px rgba(15, 23, 42, 0.05), 0 20px 40px rgba(15, 23, 42, 0.06)',
      },
    },
  },
  plugins: [],
};
