import { defineConfig } from 'eslint/config';
import reactInternal from 'eslint-config-custom/react-internal';

export default defineConfig([...reactInternal]);
