import sharedConfig from 'tailwind-config/tailwind.config';
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  presets: [sharedConfig] as Partial<Config>[],
};

export default config;
