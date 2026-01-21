import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import cardConfig from '../rollup.config.mjs';
import { getAssetsPaths, watchSourceFiles } from './rollup.utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const demoConfig = {
  input: resolve(projectRoot, 'demo/main.ts'),
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
    include: ['demo/**'],
    clearScreen: false,
    buildDelay: 100,
  },
  plugins: [
    copy({
      targets: [
        {
          src: 'node_modules/@mdi/svg/svg',
          dest: 'dist/demo/assets',
          rename: 'icons',
        },
      ],
      hook: 'buildStart',
      copySync: true,
      copyOnce: true,
      overwrite: false,
      verbose: true,
    }),
    copy({
      targets: [
        {
          src: 'demo/assets/data',
          dest: 'dist/demo/assets',
        },
        {
          src: 'demo/assets/themes',
          dest: 'dist/demo/assets',
        },
        {
          src: 'src/configs',
          dest: 'dist/demo/assets/data/yasno_v3',
        },
      ],
      hook: 'buildStart',
      copySync: true,
      copyOnce: false,
      verbose: true,
    }),
    copy({
      targets: [
        {
          src: 'demo/index.html',
          dest: 'dist/demo',
        },
        {
          src: 'demo/styles.css',
          dest: 'dist/demo',
        },
        {
          src: 'demo/redirect.html',
          dest: 'dist',
          rename: 'index.html',
        },
      ],
      hook: 'buildStart',
      copySync: true,
      copyOnce: true,
      verbose: true,
    }),
    {
      name: 'watch-assets',
      buildStart() {
        watchSourceFiles(this, {
          targets: [
            'src/configs', // card configs
            'demo/assets/data', // providers data and card configs
            'demo/assets/themes', // ha themes
          ],
          verbose: true,
        });
      },
    },
    {
      name: 'asset-manifest',
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
          const manifest = getAssetsPaths({
            targets: [
              'dist/demo/assets/data', // providers data
              'dist/demo/assets/themes', // ha themes
            ],
            relativeTo: 'dist/demo',
            verbose: true,
          });

          return `export const ASSET_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;
        }
        return null;
      },
    },
    typescript({
      tsconfig: resolve(projectRoot, 'demo/tsconfig.json'),
      rootDir: projectRoot,
      compilerOptions: {
        outDir: resolve(projectRoot, 'dist/demo'),
      },
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
};

export default [cardConfig, demoConfig];
