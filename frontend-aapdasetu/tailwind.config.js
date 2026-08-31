/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Bengali', 'Noto Sans Oriya', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'ui-monospace', 'Courier New', 'monospace'],
      },
      colors: {
        red: {
          DEFAULT: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}
