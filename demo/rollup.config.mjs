import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import cardConfig from '../rollup.config.mjs';
import { assetsManifest, watchFiles } from './rollup.utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const ROLLUP_WATCH = !!process.env.ROLLUP_WATCH;
const NODE_ENV = process.env.NODE_ENV;
const DEFAULT_ENV = ROLLUP_WATCH ? 'development' : 'production';
const environment = NODE_ENV || DEFAULT_ENV;

const demoConfig = {
  input: {
    demo: resolve(projectRoot, 'demo/demo/demo.ts'),
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
    include: ['demo/demo/**', 'demo/assets/**', 'src/configs/**'],
    clearScreen: false,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(environment),
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
      relativeTo: 'dist',
      absolute: true,
      verbose: true,
    }),
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

const scheduleConfig = {
  input: {
    schedule: resolve(projectRoot, 'demo/schedule/schedule.ts'),
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
    include: [
      'demo/schedule/**',
      'demo/demo/**',
      'demo/assets/**',
      'src/configs/**',
    ],
    clearScreen: false,
  },
  plugins: [
    replace({
      'process.env.NODE_ENV': JSON.stringify(environment),
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
      tsconfig: resolve(projectRoot, 'demo/tsconfig.json'),
      rootDir: projectRoot,
      compilerOptions: {
        outDir: resolve(projectRoot, 'dist/schedule'),
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
