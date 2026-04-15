import { resolve } from 'path';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { cardConfig } from '../rollup.config.mjs';
import {
  assetsManifest,
  syncCopyTargets,
  watchFiles,
  PROJECT_ROOT,
  ENVIRONMENT,
} from './rollup.utils.mjs';

function createDemosConfig() {
  return {
    input: {
      demo: resolve(PROJECT_ROOT, 'demo/demo/demo.ts'),
      schedule: resolve(PROJECT_ROOT, 'demo/schedule/schedule.ts'),
      screenshot: resolve(PROJECT_ROOT, 'demo/screenshot/screenshot.ts'),
    },
    output: {
      dir: 'dist',
      format: 'es',
      entryFileNames(chunkInfo) {
        const fid = chunkInfo.facadeModuleId?.replace(/\\/g, '/') || '';
        if (fid.includes('/demo/demo/demo.ts')) {
          return 'demo/demo.js';
        }
        if (fid.includes('/demo/schedule/schedule.ts')) {
          return 'schedule/schedule.js';
        }
        if (fid.includes('/demo/screenshot/screenshot.ts')) {
          return 'screenshot/screenshot.js';
        }
        return '[name].js';
      },
      chunkFileNames: 'demo/chunks/[hash].js',
      assetFileNames: '[name][extname]',
    },
    context: 'window',
    watch: {
      include: [
        'demo/demo/**',
        'demo/schedule/**',
        'demo/screenshot/**',
        'src/configs/**',
      ],
      clearScreen: false,
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(ENVIRONMENT),
        preventAssignment: true,
      }),
      watchFiles({
        targets: ['demo/', 'src/configs'],
        verbose: true,
      }),
      syncCopyTargets({
        targets: [
          {
            src: 'node_modules/@mdi/svg/svg',
            dest: 'dist/demo/assets',
            rename: 'icons',
          },
        ],
        verbose: true,
        copyOnce: true,
      }),
      syncCopyTargets({
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
            dest: 'dist/demo/assets/data/yasno_v4',
          },
        ],
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
          {
            src: 'demo/schedule/schedule.html',
            dest: 'dist/schedule',
            rename: 'index.html',
          },
          {
            src: 'demo/schedule/schedule.css',
            dest: 'dist/schedule',
          },
          {
            src: 'demo/screenshot/screenshot.html',
            dest: 'dist/screenshot',
            rename: 'index.html',
          },
          {
            src: 'demo/screenshot/screenshot.css',
            dest: 'dist/screenshot',
          },
        ],
        hook: 'buildStart',
        copySync: true,
        copyOnce: false,
        verbose: true,
      }),
      assetsManifest({
        targets: [
          'dist/demo/assets/data',
          'dist/demo/assets/themes',
          'dist/demo/assets/icons',
        ],
        variants: [
          { name: 'demo', relativeTo: 'dist/demo' },
          { name: 'schedule', relativeTo: 'dist/schedule' },
          { name: 'screenshot', relativeTo: 'dist/screenshot' },
        ],
        verbose: true,
      }),
      typescript({
        tsconfig: resolve(PROJECT_ROOT, 'demo/tsconfig.json'),
        rootDir: PROJECT_ROOT,
        compilerOptions: {
          outDir: resolve(PROJECT_ROOT, 'dist'),
        },
      }),
      nodeResolve({
        browser: true,
        preferBuiltins: false,
      }),
      commonjs(),
    ],
  };
}

export default function demoRollupConfig() {
  return [cardConfig, createDemosConfig()];
}
