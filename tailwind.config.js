/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#243b5a',
          'primary-strong': '#1b2d44',
          soft: '#efe2c5',
          accent: '#be8a3a',
          'accent-soft': '#f6ebd5',
        },
        surface: {
          base: '#f8f3e7',
          muted: '#efe6d3',
          elevated: '#fffdf8',
        },
        text: {
          primary: '#2a2f36',
          secondary: '#4f5b66',
          muted: '#7a828c',
        },
        border: {
          subtle: '#dacfb8',
          strong: '#bda778',
        },
        status: {
          success: '#2f7a45',
          warning: '#a86a12',
          danger: '#b23a3a',
          info: '#2a5f8f',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['"Noto Serif JP"', 'Georgia', '"Times New Roman"', 'serif'],
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
        ui: '0 2px 8px rgba(42, 47, 54, 0.12)',
        'ui-lg': '0 8px 24px rgba(42, 47, 54, 0.14)',
      },
    },
  },
  plugins: [],
};
