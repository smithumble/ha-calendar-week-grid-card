import { mkdirSync, cpSync, rmSync, existsSync, readdirSync } from 'fs';
import { resolve, dirname, relative } from 'path';
import { fileURLToPath } from 'url';
import commonjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import glob from 'glob';
import copy from 'rollup-plugin-copy';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    include: ['demo/**', 'src/**'],
    clearScreen: false,
  },
  plugins: [
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
          const demoRoot = __dirname;
          const manifest = [];

          // Scan everything in assets directory recursively
          try {
            const assetsPath = resolve(__dirname, 'assets');
            if (existsSync(assetsPath)) {
              // Find all files in assets directory
              const allFiles = glob.sync(resolve(assetsPath, '**/*'), {
                absolute: true,
                nodir: true,
              });

              // Add all asset files to watch list so changes trigger rebuild
              for (const file of allFiles) {
                this.addWatchFile(file);
                // Generate path relative to demo folder
                const relativePath = relative(demoRoot, file);
                manifest.push(relativePath);
              }

              // Also watch the assets directory itself for new files
              this.addWatchFile(assetsPath);
            }
          } catch (error) {
            console.warn('Failed to scan assets directory:', error);
          }

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
    {
      name: 'copy-assets',
      writeBundle() {
        // Skip copying assets in watch mode (dev)
        if (this.meta.watchMode) {
          return;
        }

        // Copy assets to dist/demo/assets, excluding icons folder
        try {
          const sourcePath = resolve(__dirname, 'assets');
          const destPath = resolve(__dirname, '../dist/demo/assets');
          const excludeList = ['icons'];

          // Ensure destination exists
          mkdirSync(destPath, { recursive: true });

          // Remove existing items in destination (except excluded ones)
          if (existsSync(destPath)) {
            const destItems = readdirSync(destPath);
            for (const item of destItems) {
              if (!excludeList.includes(item)) {
                const itemPath = resolve(destPath, item);
                rmSync(itemPath, { recursive: true, force: true });
              }
            }
          }

          // Copy items from source (except excluded ones)
          if (existsSync(sourcePath)) {
            const sourceItems = readdirSync(sourcePath);
            for (const item of sourceItems) {
              if (!excludeList.includes(item)) {
                const srcItemPath = resolve(sourcePath, item);
                const destItemPath = resolve(destPath, item);
                cpSync(srcItemPath, destItemPath, { recursive: true });
              }
            }
          }

          console.log('✓ Copied assets to dist/demo/assets (excluding icons)');
        } catch (error) {
          console.error('Failed to copy assets:', error);
        }
      },
    },
    {
      name: 'copy-icons',
      writeBundle() {
        // Skip copying icons in watch mode (dev)
        if (this.meta.watchMode) {
          return;
        }

        // Copy SVG icon files as-is to assets/icons/
        try {
          const nodeModulesSvgSource = resolve(
            __dirname,
            '../node_modules/@mdi/svg/svg',
          );
          const iconsDestPath = resolve(__dirname, '../dist/demo/assets/icons');

          // Skip copying if icons folder already exists
          if (existsSync(iconsDestPath)) {
            console.log('✓ Icons folder already exists, skipping copy');
            return;
          }

          if (existsSync(nodeModulesSvgSource)) {
            mkdirSync(iconsDestPath, { recursive: true });

            const svgFiles = readdirSync(nodeModulesSvgSource).filter((f) =>
              f.endsWith('.svg'),
            );

            for (const file of svgFiles) {
              try {
                const svgPath = resolve(nodeModulesSvgSource, file);
                const destPath = resolve(iconsDestPath, file);
                cpSync(svgPath, destPath);
              } catch (error) {
                console.warn(`Failed to copy icon ${file}:`, error);
              }
            }

            console.log(
              `✓ Copied ${svgFiles.length} icon files to assets/icons/`,
            );
          }
        } catch (error) {
          console.error('Failed to copy icons:', error);
        }
      },
    },
  ],
};
