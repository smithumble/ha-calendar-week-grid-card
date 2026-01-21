import { existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { green, greenBright, red, redBright, bold } from 'colorette';
import glob from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Get all file paths from a source path
export const getFilesPaths = (srcPath) => {
  try {
    if (!existsSync(srcPath)) {
      return [];
    }
    return glob.sync(resolve(srcPath, '**/*'), {
      absolute: true,
      nodir: true,
    });
  } catch (error) {
    const relativePath = relative(projectRoot, srcPath);
    console.warn(
      red('failed to get files from'),
      red(`${redBright(bold(relativePath))}:`),
      red(`${redBright(error)}`),
    );
    return [];
  }
};

// Create a rollup plugin to watch asset files
export const watchAssets = (options) => ({
  name: 'watch-assets',
  buildStart() {
    const { targets, verbose = false } = options;
    const targetList = Array.isArray(targets) ? targets : [targets];

    const successPaths = [];
    const failedPaths = [];

    for (const target of targetList) {
      const sourcePath = resolve(projectRoot, target);
      const relativePath = relative(projectRoot, sourcePath);

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
          red('failed to watch assets'),
          red(`${redBright(bold(relativePath))}:`),
          red(`${redBright(error)}`),
        );
        failedPaths.push(relativePath);
      }
    }

    if (verbose) {
      if (successPaths.length > 0) {
        console.log(
          green(
            `watching assets:\n  ${greenBright(bold(successPaths.join('\n  ')))}`,
          ),
        );
      }
      if (failedPaths.length > 0) {
        console.log(
          red(
            `failed to watch assets:\n  ${redBright(bold(failedPaths.join('\n  ')))}`,
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
      const resolvedRelativeTo = resolve(projectRoot, relativeTo);
      const manifest = [];

      for (const target of targetList) {
        const targetPath = resolve(projectRoot, target);
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
