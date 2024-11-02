import sharedConfig from 'tailwind-config/tailwind.config';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [sharedConfig] as Partial<Config>[],
  darkMode: ['class'],
  prefix: 'ex-',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
};

export default config;
