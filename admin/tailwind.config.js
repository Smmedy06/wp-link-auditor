/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#2575f0',
        'brand-dark': '#1e293b',
        'brand-light': '#f8fafc',
      },
      animation: {
        'spin-slow': 'spin 1.5s linear infinite',
      }
    },
  },
  plugins: [],
}

