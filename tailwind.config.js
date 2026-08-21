/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fl: {
          black: '#0A0A0C',
          graphite: '#19191C',
          'graphite-light': '#28282F',
          gold: '#C9A159',
          'gold-soft': '#DFC08E',
          'gold-dim': '#8C7A54',
        },
        background: '#0A0A0C',
        foreground: '#F5F5F5',
        card: '#19191C',
        border: '#2C2C31',
        muted: '#9B9BA3',
        destructive: '#E5473F',
      },
      fontFamily: {
        sans: ['InstrumentSans_400Regular'],
        medium: ['InstrumentSans_500Medium'],
        semibold: ['InstrumentSans_600SemiBold'],
        bold: ['InstrumentSans_700Bold'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '16px',
        xl: '22px',
      },
    },
  },
  plugins: [],
};
