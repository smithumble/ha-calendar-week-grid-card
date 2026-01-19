import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { copyAsset, getFilesPaths, watchSourceFiles } from './rollup.utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

export default {
  input: resolve(__dirname, '../demo/main.ts'),
  output: {
    dir: 'dist/demo',
    format: 'es',
    entryFileNames: 'main.js',
    assetFileNames: '[name][extname]',
  },
  external: (id) => {
    // Mark card script as external - it will be loaded at runtime
    if (id.includes('calendar-week-grid-card.js')) {
      return true;
    }
    return false;
  },
  context: 'window',
  watch: {
    include: ['demo/**', 'src/configs/**'],
    clearScreen: false,
    buildDelay: 100,
  },
  plugins: [
    {
      name: 'copy-assets',
      buildStart() {
        const assetsCopyRules = [
          {
            src: '../node_modules/@mdi/svg/svg',
            dst: '../dist/demo/assets/icons',
            force: false,
          },
          {
            src: 'assets/data',
            dst: '../dist/demo/assets/data',
          },
          {
            src: 'assets/themes',
            dst: '../dist/demo/assets/themes',
          },
          {
            src: '../src/configs',
            dst: '../dist/demo/assets/data/yasno_v3/configs',
          },
        ];

        for (const rule of assetsCopyRules) {
          const sourcePath = resolve(__dirname, rule.src);
          const destPath = resolve(__dirname, rule.dst);

          copyAsset(sourcePath, destPath, projectRoot, rule.force);
          watchSourceFiles(this, sourcePath, projectRoot);
        }
      },
    },
    {
      name: 'asset-manifest',
      buildStart() {
        // Watch asset directories for changes (only once per build cycle)
        const distAssets = [
          '../dist/demo/assets/data',
          '../dist/demo/assets/themes',
        ];

        for (const distAsset of distAssets) {
          const distAssetsPath = resolve(__dirname, distAsset);
          watchSourceFiles(this, distAssetsPath, projectRoot);
        }
      },
      resolveId(source) {
        // Create virtual module for asset manifest
        if (source === 'virtual:asset-manifest') {
          return source;
        }
        return null;
      },
      load(id) {
        // Generate asset manifest virtual module
        if (id === 'virtual:asset-manifest') {
          const distAssets = [
            '../dist/demo/assets/data',
            '../dist/demo/assets/themes',
          ];
          const distDemoRoot = resolve(__dirname, '../dist/demo');
          const manifest = [];

          for (const distAsset of distAssets) {
            const distAssetsPath = resolve(__dirname, distAsset);

            // Get all paths for manifest
            const allFiles = getFilesPaths(distAssetsPath, projectRoot);
            for (const file of allFiles) {
              const relativePath = relative(distDemoRoot, file);
              manifest.push(relativePath);
            }
          }

          console.log(
            `✓ Generated asset manifest with ${manifest.length} files`,
          );

          return `export const ASSET_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;
        }
        return null;
      },
    },
    typescript({
      tsconfig: resolve(__dirname, '../demo/tsconfig.json'),
      rootDir: resolve(__dirname, '..'),
      compilerOptions: {
        outDir: resolve(__dirname, '../dist/demo'),
      },
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
    copy({
      targets: [
        { src: 'demo/index.html', dest: 'dist/demo' },
        { src: 'demo/styles.css', dest: 'dist/demo' },
        { src: 'demo/redirect.html', dest: 'dist', rename: 'index.html' },
      ],
      hook: 'writeBundle',
    }),
  ],
};
