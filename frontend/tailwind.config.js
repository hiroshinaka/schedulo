/** @type {import('tailwindcss').Config} */
const withOpacity = (variableName) => ({ opacityValue }) => {
  if (opacityValue !== undefined) {
    return `rgb(var(${variableName}) / ${opacityValue})`;
  }
  return `rgb(var(${variableName}))`;
};

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        'brand-main': withOpacity('--brand-main-rgb'),
        'brand-contrast': 'var(--brand-contrast)',
      },
    },
  },
  plugins: [],
};