import {
  existsSync,
  mkdirSync,
  rmSync,
  rmdirSync,
  readdirSync,
  statSync,
  copyFileSync,
} from 'fs';
import { resolve, relative, dirname, basename } from 'path';
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

/**
 * Rollup plugin: registers directories under PROJECT_ROOT so Rollup watches all nested files during watch mode.
 * @param {object} options
 * @param {string | string[]} options.targets Asset directories under PROJECT_ROOT.
 * @param {boolean} [options.verbose] Log watched paths and watch failures.
 */
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

const removeEmptyDirectories = (directoryPath, stopAt) => {
  const resolvedStopAt = resolve(stopAt);
  let currentPath = resolve(directoryPath);

  while (
    currentPath.startsWith(resolvedStopAt) &&
    currentPath !== resolvedStopAt &&
    existsSync(currentPath)
  ) {
    const entries = readdirSync(currentPath);
    if (entries.length > 0) {
      return;
    }
    rmdirSync(currentPath);
    currentPath = dirname(currentPath);
  }
};

const resolveCopyTarget = (target) => {
  const sourcePath = resolve(PROJECT_ROOT, target.src);
  const destinationPath = resolve(PROJECT_ROOT, target.dest);
  const sourceExists = existsSync(sourcePath);
  const sourceStats = sourceExists ? statSync(sourcePath) : null;
  const sourceName = target.rename || basename(sourcePath);

  if (!sourceExists || !sourceStats) {
    return {
      sourcePath,
      destinationRootPath: resolve(destinationPath, sourceName || ''),
      outputFiles: [],
    };
  }

  if (sourceStats.isDirectory()) {
    const destinationRootPath = resolve(destinationPath, sourceName || '');
    const sourceFiles = globSync(resolve(sourcePath, '**/*'), {
      absolute: true,
      nodir: true,
    });

    const outputFiles = sourceFiles.map((sourceFilePath) => ({
      sourceFilePath,
      destinationFilePath: resolve(
        destinationRootPath,
        relative(sourcePath, sourceFilePath),
      ),
    }));

    return { sourcePath, destinationRootPath, outputFiles };
  }

  return {
    sourcePath,
    destinationRootPath: destinationPath,
    outputFiles: [
      {
        sourceFilePath: sourcePath,
        destinationFilePath: resolve(
          destinationPath,
          target.rename || basename(sourcePath) || '',
        ),
      },
    ],
  };
};

/**
 * Rollup plugin: on each `buildStart`, copies `src` to `dest` (file or tree), removes destination files no longer in the expected set, and watches sources.
 * @param {object} options
 * @param {{ src: string, dest: string, rename?: string } | { src: string, dest: string, rename?: string }[]} options.targets Copy specs under PROJECT_ROOT (`src` path; `dest` directory; optional `rename` basename for the copied root file or folder).
 * @param {boolean} [options.verbose] Log watched roots, copy count, and pruned files.
 * @param {boolean} [options.copyOnce] If true in watch mode, run the full copy/prune/watch registration only on the first `buildStart` (skips later rebuilds).
 */
export const syncCopyTargets = (options) => {
  let copyOnceDoneInWatch = false;
  return {
    name: 'sync-copy-targets',
    buildStart() {
      const { targets, verbose = false, copyOnce = false } = options;

      if (copyOnce && ROLLUP_WATCH && copyOnceDoneInWatch) {
        return;
      }
      const targetList = Array.isArray(targets) ? targets : [targets];
      const resolvedTargets = targetList.map((target) =>
        resolveCopyTarget(target),
      );
      const expectedFiles = new Set();
      const copiedFiles = [];
      const removedFiles = [];
      const watchedPaths = [];

      for (const { outputFiles } of resolvedTargets) {
        for (const { destinationFilePath } of outputFiles) {
          expectedFiles.add(destinationFilePath);
        }
      }

      for (const { sourcePath, outputFiles } of resolvedTargets) {
        if (existsSync(sourcePath)) {
          this.addWatchFile(sourcePath);
          watchedPaths.push(relative(PROJECT_ROOT, sourcePath));
        }

        for (const { sourceFilePath, destinationFilePath } of outputFiles) {
          mkdirSync(dirname(destinationFilePath), { recursive: true });
          copyFileSync(sourceFilePath, destinationFilePath);
          this.addWatchFile(sourceFilePath);
          copiedFiles.push(relative(PROJECT_ROOT, destinationFilePath));
        }
      }

      for (const { destinationRootPath } of resolvedTargets) {
        if (!existsSync(destinationRootPath)) {
          continue;
        }

        const existingDestinationFiles = globSync(
          resolve(destinationRootPath, '**/*'),
          {
            absolute: true,
            nodir: true,
          },
        );

        for (const destinationFilePath of existingDestinationFiles) {
          if (!expectedFiles.has(destinationFilePath)) {
            rmSync(destinationFilePath, { force: true });
            removeEmptyDirectories(
              dirname(destinationFilePath),
              destinationRootPath,
            );
            removedFiles.push(relative(PROJECT_ROOT, destinationFilePath));
          }
        }
      }

      if (verbose) {
        if (watchedPaths.length > 0) {
          console.log(
            green(
              `sync copy watching:\n  ${greenBright(bold(watchedPaths.join('\n  ')))}`,
            ),
          );
        }
        console.log(
          green(
            `sync copied ${greenBright(bold(String(copiedFiles.length)))} files`,
          ),
        );
        if (removedFiles.length > 0) {
          console.log(
            red(
              `sync removed:\n  ${redBright(bold(removedFiles.join('\n  ')))}`,
            ),
          );
        }
      }

      if (copyOnce && ROLLUP_WATCH) {
        copyOnceDoneInWatch = true;
      }
    },
  };
};

const DEFAULT_ASSET_MANIFEST_VIRTUAL_PREFIX = 'virtual:asset-manifest/';

/**
 * Rollup plugin: resolves `virtual:asset-manifest/<name>` to a module exporting `ASSET_MANIFEST` (relative paths from each variant’s `relativeTo`).
 * @param {object} options
 * @param {string | string[]} options.targets Asset directories under PROJECT_ROOT (e.g. dist/demo/assets/data).
 * @param {{ name: string, relativeTo: string }[]} options.variants Virtual module id `virtual:asset-manifest/<name>` and path prefix for each app output folder.
 * @param {string} [options.virtualPrefix] Defaults to `virtual:asset-manifest/`.
 * @param {boolean} [options.verbose] Log manifest generation per variant.
 */
export const assetsManifest = (options) => {
  const {
    targets,
    variants,
    verbose = true,
    virtualPrefix = DEFAULT_ASSET_MANIFEST_VIRTUAL_PREFIX,
  } = options;

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      'assetsManifest: `variants` must be a non-empty array of { name, relativeTo }',
    );
  }

  const targetList = Array.isArray(targets) ? targets : [targets];

  const buildManifestForRelativeTo = (relativeToDir) => {
    const resolvedRelativeTo = resolve(PROJECT_ROOT, relativeToDir);
    const manifest = [];
    for (const target of targetList) {
      const targetPath = resolve(PROJECT_ROOT, target);
      const allFiles = getFilesPaths(targetPath);
      for (const file of allFiles) {
        manifest.push(relative(resolvedRelativeTo, file));
      }
    }
    return manifest;
  };

  return {
    name: 'asset-manifest',
    resolveId(source) {
      if (!source.startsWith(virtualPrefix)) {
        return null;
      }
      const name = source.slice(virtualPrefix.length);
      if (!variants.some((v) => v.name === name)) {
        return null;
      }
      return `\0asset-manifest:${name}`;
    },
    load(id) {
      if (!id.startsWith('\0asset-manifest:')) {
        return null;
      }
      const name = id.slice('\0asset-manifest:'.length);
      const variant = variants.find((v) => v.name === name);
      if (!variant) {
        return null;
      }
      const manifest = buildManifestForRelativeTo(variant.relativeTo);

      if (verbose) {
        console.log(
          green(`generated:\n `),
          green(`${greenBright(bold(`asset manifest (${name})`))} with`),
          green(`${greenBright(bold(manifest.length))} files`),
        );
      }

      return `export const ASSET_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;
    },
  };
};
