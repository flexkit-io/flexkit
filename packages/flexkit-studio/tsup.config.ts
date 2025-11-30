import { defineConfig } from 'tsup';
import path from 'node:path';
const workspacePackages = new Set(['@flexkit/core', '@flexkit/asset-manager', '@flexkit/desk', '@flexkit/explorer']);

const getPackageName = (specifier: string): string => {
  if (specifier.startsWith('@')) {
    const [scope, name] = specifier.split('/');
    return name ? `${scope}/${name}` : specifier;
  }
  const [name] = specifier.split('/');
  return name;
};

export default defineConfig((options) => ({
  treeshake: true,
  splitting: true,
  entry: ['src/index.ts', 'src/ssr.ts', 'src/plugins.ts', 'src/ui.ts', 'src/data-grid.ts'],
  format: ['esm'],
  platform: 'browser',
  dts: true,
  sourcemap: true,
  minify: !options.watch,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  skipNodeModulesBundle: true,
  noExternal: ['@flexkit/core', '@flexkit/asset-manager', '@flexkit/desk', '@flexkit/explorer'],
  esbuildOptions(esbuildOptions) {
    esbuildOptions.plugins = [
      ...(esbuildOptions.plugins ?? []),
      {
        name: 'externalize-third-party',
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.path.startsWith('.') || path.isAbsolute(args.path)) {
              return;
            }

            const pkgName = getPackageName(args.path);
            if (workspacePackages.has(pkgName)) {
              return;
            }

            return { path: args.path, external: true };
          });
        },
      },
    ];
  },
}));
