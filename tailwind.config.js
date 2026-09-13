/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f5f5f5',
        paper: '#ffffff',
        surfaceAlt: '#fafafa',
        ink: '#0a0a0a',
        inkSoft: '#171717',
        midGray: '#737373',
        hairline: '#e5e5e5',
        ember: '#e7000b',
      },
      borderRadius: {
        card: '24px',
        pill: '18px',
        nested: '10px',
      },
      fontFamily: {
        sans: ['Geist', 'Inter', 'ui-sans-serif', 'system-ui'],
      },
      boxShadow: {
        card: '0 0 0 1px rgba(23,23,23,0.05), 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
      },
    },
  },
  plugins: [],
};
