import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../apps/**/app/**/*.{js,ts,jsx,tsx}',
    '../../packages/flexkit-studio/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/flexkit-desk/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
