/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Helvetica', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'ui-monospace', 'Courier New', 'monospace'],
      },
      colors: {
        red: {
          DEFAULT: '#dc2626',
        },
        brand: {
          50: '#fff2e6',
          100: '#ffd9b3',
          200: '#ffb780',
          300: '#ff8c42',
          400: '#ff6a1a',
          500: '#ff4d00',
          600: '#e64e0e',
          700: '#cc3d08',
          800: '#a3300a',
          900: '#7c2608',
          DEFAULT: '#e64e0e',
        },
      },
    },
  },
  plugins: [],
}
