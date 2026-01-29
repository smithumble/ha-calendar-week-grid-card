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

export const scheduleConfig = {
  input: {
    schedule: resolve(PROJECT_ROOT, 'demo/schedule/schedule.ts'),
  },
  output: {
    dir: 'dist/schedule',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    assetFileNames: '[name][extname]',
  },
  context: 'window',
  watch: {
    include: ['demo/schedule/**', 'demo/demo/**', 'src/configs/**'],
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
          src: 'demo/schedule/schedule.html',
          dest: 'dist/schedule',
          rename: 'index.html',
        },
        {
          src: 'demo/schedule/schedule.css',
          dest: 'dist/schedule',
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
        outDir: resolve(PROJECT_ROOT, 'dist/schedule'),
      },
    }),
    nodeResolve({
      browser: true,
      preferBuiltins: false,
    }),
    commonjs(),
  ],
};

export default [cardConfig, demoConfig, scheduleConfig];
