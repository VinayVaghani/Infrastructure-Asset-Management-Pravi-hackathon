/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gov: {
          50: '#f0f4f9',
          100: '#dde6f0',
          200: '#bfd2e4',
          300: '#94b5d2',
          400: '#6392be',
          500: '#4074a8',
          600: '#2e5b8c',
          700: '#254972',
          800: '#1b3452',
          900: '#0e1e32',
          950: '#08121f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
