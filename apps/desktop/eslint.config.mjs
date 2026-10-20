import library from 'eslint-config-custom/library';

export default [
  ...library,
  { ignores: ['out/**', 'dist/**', 'build/**'] },
  // The main process logs to the terminal (opt-in debug output, update checks).
  { files: ['src/main/**'], rules: { 'no-console': 'off' } },
  // electron-builder loads hooks with require().
  { files: ['scripts/**'], rules: { 'no-console': 'off', '@typescript-eslint/no-require-imports': 'off' } },
];
