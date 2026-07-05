/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#FEFDFB',
        ink: {
          DEFAULT: '#1C1C1A',
          mute: '#A6A69E',
          faint: '#C9C7C0',
        },
        hairline: '#ECEAE4',
        track: '#EEEDE8',
        racing: '#E5202E',
      },
      fontFamily: {
        digit: ['BarlowCondensed_500Medium_Italic'],
        digitbold: ['BarlowCondensed_600SemiBold_Italic'],
      },
    },
  },
  plugins: [],
};
