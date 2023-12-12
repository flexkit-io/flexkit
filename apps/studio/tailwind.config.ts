// tailwind config is required for editor support

import sharedConfig from 'tailwind-config/tailwind.config';
import flexkitStudioConfig from '@flexkit/studio/tailwind.config';

const config = {
  presets: [sharedConfig],
  darkMode: ['class'],
  theme: flexkitStudioConfig.theme,
  plugins: [require('tailwindcss-animate')],
};

export default config;
