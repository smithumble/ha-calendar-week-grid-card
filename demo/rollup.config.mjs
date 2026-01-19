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
    include: ['demo/**', 'src/configs/**'],
    clearScreen: false,
    buildDelay: 100,
  },
  plugins: [
    {
      name: 'copy-icons',
      buildStart() {
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
    (() => {
      const copyAssets = () => {
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

          console.log('✓ Copied demo assets to dist/demo/assets');
        } catch (error) {
          console.error('Failed to copy assets:', error);
        }
      };

      return {
        name: 'copy-assets',
        buildStart() {
          // Copy assets early so they're available for asset-manifest
          copyAssets();

          // Watch source files to trigger rebuild on changes
          try {
            const sourcePath = resolve(__dirname, 'assets');
            if (existsSync(sourcePath)) {
              const sourceFiles = glob.sync(resolve(sourcePath, '**/*'), {
                absolute: true,
              });
              for (const file of sourceFiles) {
                this.addWatchFile(file);
              }
            }
          } catch (error) {
            console.warn('Failed to watch demo assets:', error);
          }
        },
        watchChange(id) {
          // Re-copy assets when watched files change
          const sourcePath = resolve(__dirname, 'assets');
          if (id.startsWith(sourcePath)) {
            copyAssets();
          }
        },
      };
    })(),
    (() => {
      const copySrcAssets = () => {
        try {
          const sourcePath = resolve(__dirname, '../src/configs');
          const destPath = resolve(
            __dirname,
            '../dist/demo/assets/data/yasno_v3/configs',
          );
          const excludeList = [];

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

          console.log(
            '✓ Copied src/configs to dist/demo/assets/data/yasno_v3/configs',
          );
        } catch (error) {
          console.error('Failed to copy assets:', error);
        }
      };

      return {
        name: 'copy-src-assets',
        buildStart() {
          // Copy src/configs to dist/demo/assets/data/yasno_v3/configs
          copySrcAssets();

          // Watch source files to trigger rebuild on changes
          try {
            const sourcePath = resolve(__dirname, '../src/configs');
            if (existsSync(sourcePath)) {
              const sourceFiles = glob.sync(resolve(sourcePath, '**/*'), {
                absolute: true,
              });
              for (const file of sourceFiles) {
                this.addWatchFile(file);
              }
            }
          } catch (error) {
            console.warn('Failed to watch src/configs:', error);
          }
        },
        watchChange(id) {
          // Re-copy src/configs when watched files change
          const sourcePath = resolve(__dirname, '../src/configs');
          if (id.startsWith(sourcePath)) {
            copySrcAssets();
          }
        },
      };
    })(),
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
          const distDemoRoot = resolve(__dirname, '../dist/demo');
          const manifest = [];

          // Watch source assets to trigger rebuild when they change
          try {
            const sourceAssetsPath = resolve(__dirname, 'assets');
            if (existsSync(sourceAssetsPath)) {
              const sourceFiles = glob.sync(resolve(sourceAssetsPath, '**/*'), {
                absolute: true,
                nodir: true,
              });
              // Watch source files to trigger rebuild
              for (const file of sourceFiles) {
                this.addWatchFile(file);
              }
              // Also watch the assets directory itself for new files
              this.addWatchFile(sourceAssetsPath);
            }
          } catch (error) {
            console.warn('Failed to watch source assets:', error);
          }

          // Read from dist/demo/assets to generate manifest
          try {
            const distAssetsPath = resolve(__dirname, '../dist/demo/assets');
            if (existsSync(distAssetsPath)) {
              // Find all files in dist assets directory
              const allFiles = glob.sync(resolve(distAssetsPath, '**/*'), {
                absolute: true,
                nodir: true,
              });

              // Generate paths relative to dist/demo folder
              for (const file of allFiles) {
                const relativePath = relative(distDemoRoot, file);
                manifest.push(relativePath);
              }
            }
          } catch (error) {
            console.warn('Failed to scan dist assets directory:', error);
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
  ],
};
