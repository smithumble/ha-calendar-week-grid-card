import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { cardConfig } from '../rollup.config.mjs';
import {
  assetsManifest,
  watchFiles,
  PROJECT_ROOT,
  ENVIRONMENT,
} from './rollup.utils.mjs';

export const demoConfig = {
  input: {
    demo: resolve(PROJECT_ROOT, 'demo/demo/demo.ts'),
  },
  output: {
    dir: 'dist/demo',
    format: 'es',
    entryFileNames: '[name].js',
    chunkFileNames: '[name].js',
    assetFileNames: '[name][extname]',
  },
  context: 'window',
  watch: {
    include: ['demo/demo/**', 'src/configs/**'],
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
          src: 'demo/demo/assets/data',
          dest: 'dist/demo/assets',
        },
        {
          src: 'demo/demo/assets/themes',
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
          src: 'demo/root.html',
          dest: 'dist',
          rename: 'index.html',
        },
        {
          src: 'demo/demo/common.css',
          dest: 'dist/demo',
        },
        {
          src: 'demo/demo/demo.html',
          dest: 'dist/demo',
          rename: 'index.html',
        },
        {
          src: 'demo/demo/demo.css',
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
      relativeTo: 'dist/demo',
      absolute: false,
      verbose: true,
    }),
    typescript({
      tsconfig: resolve(PROJECT_ROOT, 'demo/tsconfig.json'),
      rootDir: PROJECT_ROOT,
      compilerOptions: {
        outDir: resolve(PROJECT_ROOT, 'dist/demo'),
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
