import sharedConfig from 'tailwind-config/tailwind.config';
import type { Config } from 'tailwindcss';

const config: Config = {
  presets: [sharedConfig] as Partial<Config>[],
  darkMode: ['class', '[style="color-scheme: dark;"]'],
  prefix: 'fk-',
  content: sharedConfig.content,
};

export default config;
