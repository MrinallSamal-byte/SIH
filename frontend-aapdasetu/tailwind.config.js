/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Google Sans', 'Open Sans', 'Noto Sans Devanagari', 'Noto Sans Oriya', 'system-ui', '-apple-system', 'sans-serif'],
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
