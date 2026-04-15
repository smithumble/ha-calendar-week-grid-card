import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import copy from 'rollup-plugin-copy';
import { cardConfig } from '../rollup.config.mjs';
import { assetsManifest } from './rollup.plugin.assets-manifest.mjs';
import { sync } from './rollup.plugin.sync.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const ROLLUP_WATCH = !!process.env.ROLLUP_WATCH;
const NODE_ENV = process.env.NODE_ENV;
const DEFAULT_ENV = ROLLUP_WATCH ? 'development' : 'production';
const ENVIRONMENT = NODE_ENV || DEFAULT_ENV;

const SYNC_COPY_REBUILD_TRIGGER_PATH = 'dist/demo/.sync-copy-targets-trigger';

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
        SYNC_COPY_REBUILD_TRIGGER_PATH,
      ],
      clearScreen: false,
    },
    plugins: [
      replace({
        'process.env.NODE_ENV': JSON.stringify(ENVIRONMENT),
        preventAssignment: true,
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
      sync({
        targets: [
          {
            src: 'node_modules/@mdi/svg/svg/**',
            dest: 'dist/demo/assets/icons',
            syncOnce: true,
          },
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
        rebuildTriggerPath: SYNC_COPY_REBUILD_TRIGGER_PATH,
      }),
      assetsManifest({
        targets: [
          { path: 'dist/demo/assets/data' },
          { path: 'dist/demo/assets/themes' },
          { path: 'dist/demo/assets/icons', discoverOnce: true },
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
