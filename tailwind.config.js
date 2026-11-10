/**
 * Mirrors src/theme/tokens.ts (the source of truth — screens use StyleSheet +
 * tokens). Kept in sync so any NativeWind class uses the same brand values.
 * @type {import('tailwindcss').Config}
 */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        fl: {
          carbon: '#0B0B0C',
          graphite: '#1E1E21',
          gold: '#C9AE8B',
          'gold-light': '#E6D1B5',
          'gold-deep': '#8C7454',
          bone: '#F8F7F3',
        },
        background: '#F8F7F3',
        foreground: '#0B0B0C',
        card: '#FFFFFF',
        'surface-muted': '#EFECE5',
        accent: '#8C7454',
        border: '#E3DED4',
        hairline: '#ECE8E0',
        muted: '#5E5B55',
        subtle: '#6F6B63',
        destructive: '#C2362E',
        success: '#2F7D55',
      },
      fontFamily: {
        sans: ['Manrope_400Regular'],
        medium: ['Manrope_500Medium'],
        semibold: ['Manrope_600SemiBold'],
        bold: ['Manrope_700Bold'],
        heading: ['Montserrat_700Bold'],
        brand: ['Syncopate_700Bold'],
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '18px',
        xl: '24px',
      },
    },
  },
  plugins: [],
};
