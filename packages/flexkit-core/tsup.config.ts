import { defineConfig } from 'tsup';

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['src/**/*.tsx'],
  format: ['esm'],
  platform: 'browser',
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react', 'react-dom'],
  esbuildOptions(options) {
    options.plugins = [
      ...(options.plugins || []),
      {
        name: 'css-import-handler',
        setup(build) {
          build.onResolve({ filter: /\.css$/ }, (args) => {
            // Keep CSS imports as external so Next.js can process them
            // Don't transform relative CSS imports - let Next.js handle them
            return {
              path: args.path,
              external: true,
            };
          });
        },
      },
    ];
  },
}));
