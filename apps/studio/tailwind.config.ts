// tailwind config is required for editor support

import sharedConfig from 'tailwind-config/tailwind.config';
import flexkitStudioConfig from '@flexkit/studio/tailwind.config';

const config = {
  presets: [sharedConfig],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './flexkit.config.tsx',
  ],
  darkMode: ['class'],
  theme: flexkitStudioConfig.theme,
  plugins: [require('tailwindcss-animate')],
};

export default config;
