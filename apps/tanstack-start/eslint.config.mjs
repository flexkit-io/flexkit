import { defineConfig, globalIgnores } from 'eslint/config';
import reactInternal from 'eslint-config-custom/react-internal';

export default defineConfig([
  ...reactInternal,

  globalIgnores(['dist/**', '.nitro/**', '.output/**', '.tanstack/**', '.vinxi/**', 'coverage/**']),
]);
