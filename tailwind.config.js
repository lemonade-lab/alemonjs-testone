/**
 * @type {import('tailwindcss/types/config').Config}
 */
export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        mn: '240px',
        xs: '320px'
      }
    }
  }
};
