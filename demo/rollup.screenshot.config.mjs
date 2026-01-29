import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { cardConfig } from '../rollup.config.mjs';
import { demoConfig } from './rollup.demo.config.mjs';
import {
  assetsManifest,
  watchFiles,
  PROJECT_ROOT,
  ENVIRONMENT,
} from './rollup.utils.mjs';

export const screenshotConfig = {
  input: {
    screenshot: resolve(PROJECT_ROOT, 'demo/screenshot/screenshot.ts'),
  },
  output: {
    dir: 'dist/screenshot',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    assetFileNames: '[name][extname]',
  },
  context: 'window',
  watch: {
    include: ['demo/screenshot/**', 'demo/demo/**', 'src/configs/**'],
    clearScreen: false,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(ENVIRONMENT),
      preventAssignment: true,
    }),
    watchFiles({
      targets: [
        'demo/', // demo files and assets
        'src/configs', // card configs
      ],
      verbose: true,
    }),
    copy({
      targets: [
        {
          src: 'demo/screenshot/screenshot.html',
          dest: 'dist/screenshot',
          rename: 'index.html',
        },
        {
          src: 'demo/screenshot/screenshot.css',
          dest: 'dist/screenshot',
        },
        {
          src: 'demo/demo/common.css',
          dest: 'dist/demo',
        },
      ],
      hook: 'buildStart',
      copySync: true,
      copyOnce: false,
      verbose: true,
    }),
    assetsManifest({
      targets: [
        'dist/demo/assets/data', // providers data
        'dist/demo/assets/themes', // ha themes
      ],
      relativeTo: 'dist',
      absolute: true,
      verbose: true,
    }),
    typescript({
      tsconfig: resolve(PROJECT_ROOT, 'demo/tsconfig.json'),
      rootDir: PROJECT_ROOT,
      compilerOptions: {
        outDir: resolve(PROJECT_ROOT, 'dist/screenshot'),
      },
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
};

export default [cardConfig, demoConfig, screenshotConfig];
