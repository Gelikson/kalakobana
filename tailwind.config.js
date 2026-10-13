/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['var(--font-georgian)', 'system-ui', 'sans-serif'] },
      colors: {
        ink: { 950: '#0b0e26', 900: '#101433', 800: '#171c45', 700: '#222862', 600: '#33398a' },
        chalk: '#f3f0ff',
        marigold: '#ffc93c',
        persimmon: '#ff6b4a',
        mint: '#5ee6b8',
        lilac: '#a98bff',
        sky: '#5cc8ff',
      },
      keyframes: {
        tick: { '0%,100%': { transform: 'scale(1)' }, '50%': { transform: 'scale(1.08)' } },
        drop: { '0%': { transform: 'translateY(-40px) rotate(-14deg)', opacity: '0' }, '100%': { transform: 'translateY(0) rotate(-4deg)', opacity: '1' } },
      },
      animation: { tick: 'tick 0.6s ease-in-out infinite', drop: 'drop 0.5s cubic-bezier(.2,.9,.3,1.3) both' },
    },
  },
  plugins: [],
};
