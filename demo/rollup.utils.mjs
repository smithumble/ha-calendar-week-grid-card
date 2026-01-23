import { existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { green, greenBright, red, redBright, bold } from 'colorette';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ROOT = resolve(__dirname, '..');

const ROLLUP_WATCH = !!process.env.ROLLUP_WATCH;
const NODE_ENV = process.env.NODE_ENV;
const DEFAULT_ENV = ROLLUP_WATCH ? 'development' : 'production';

export const ENVIRONMENT = NODE_ENV || DEFAULT_ENV;

// Get all file paths from a source path
export const getFilesPaths = (srcPath) => {
  try {
    if (!existsSync(srcPath)) {
      return [];
    }
    return globSync(resolve(srcPath, '**/*'), {
      absolute: true,
      nodir: true,
    });
  } catch (error) {
    const relativePath = relative(PROJECT_ROOT, srcPath);
    console.warn(
      red('failed to get files from'),
      red(`${redBright(bold(relativePath))}:`),
      red(`${redBright(error)}`),
    );
    return [];
  }
};

// Create a rollup plugin to watch asset files
export const watchFiles = (options) => ({
  name: 'watch-files',
  buildStart() {
    const { targets, verbose = false } = options;
    const targetList = Array.isArray(targets) ? targets : [targets];

    const successPaths = [];
    const failedPaths = [];

    for (const target of targetList) {
      const sourcePath = resolve(PROJECT_ROOT, target);
      const relativePath = relative(PROJECT_ROOT, sourcePath);

      try {
        if (existsSync(sourcePath)) {
          const sourceFiles = getFilesPaths(sourcePath);
          for (const file of sourceFiles) {
            this.addWatchFile(file);
          }
          this.addWatchFile(sourcePath);
          successPaths.push(relativePath);
        }
      } catch (error) {
        console.warn(
          red('failed to watch'),
          red(`${redBright(bold(relativePath))}:`),
          red(`${redBright(error)}`),
        );
        failedPaths.push(relativePath);
      }
    }

    if (verbose) {
      if (successPaths.length > 0) {
        console.log(
          green(`watching:\n  ${greenBright(bold(successPaths.join('\n  ')))}`),
        );
      }
      if (failedPaths.length > 0) {
        console.log(
          red(
            `failed to watch:\n  ${redBright(bold(failedPaths.join('\n  ')))}`,
          ),
        );
      }
    }
  },
});

// Create a rollup plugin to generate asset manifest as virtual module
export const assetsManifest = (options) => ({
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
      const { targets, relativeTo, absolute = false, verbose = true } = options;
      const targetList = Array.isArray(targets) ? targets : [targets];
      const resolvedRelativeTo = resolve(PROJECT_ROOT, relativeTo);
      const manifest = [];

      for (const target of targetList) {
        const targetPath = resolve(PROJECT_ROOT, target);
        const allFiles = getFilesPaths(targetPath);

        for (const file of allFiles) {
          let relativeAssetPath = relative(resolvedRelativeTo, file);
          if (absolute) {
            relativeAssetPath = '/' + relativeAssetPath;
          }
          manifest.push(relativeAssetPath);
        }
      }

      if (verbose) {
        console.log(
          green(`generated:\n `),
          green(`${greenBright(bold('asset manifest'))} with`),
          green(`${greenBright(bold(manifest.length))} files`),
        );
      }

      return `export const ASSET_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;
    }
    return null;
  },
});
