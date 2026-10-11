/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { raized: { black: '#050505', yellow: '#ffe000', red: '#e52b20', grey: '#242424' } },
    fontFamily: { mono: ['"Cascadia Code"', '"Cascadia Code PL"', 'Consolas', 'monospace'] }
  }},
  plugins: []
}