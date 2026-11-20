import colors from 'tailwindcss/colors'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#0B1F3A',
        paper: '#F6F8FB',
        soft: '#EEF2F7',
        line: '#E2E8F0',
        ink: '#0B1F3A',
        body: '#334155',
        muted: '#64748B',
        primary: { DEFAULT: '#0E7C7B', hover: '#0A6363' },
        secondary: '#2563EB',
        success: '#0F766E',
        warning: '#B45309',
        critical: '#B91C1C',
        teal: { ...colors.teal, DEFAULT: '#0E7C7B' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.04), 0 4px 14px rgba(15,23,42,.06)',
        lift: '0 8px 28px rgba(15,23,42,.10)',
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
  plugins: [],
}
