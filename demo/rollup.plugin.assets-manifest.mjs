import { existsSync } from 'fs';
import { resolve, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { green, greenBright, red, redBright, bold } from 'colorette';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const GLOB_FILES_OPTIONS = {
  absolute: true,
  nodir: true,
};

/**
 * Rollup plugin: resolves `virtual:asset-manifest/<name>` to a module exporting `ASSET_MANIFEST` (relative paths from each variant’s `relativeTo`).
 * @param {object} options
 * @param {{ path: string, discoverOnce?: boolean }[]} options.targets Asset directories under PROJECT_ROOT. `discoverOnce` defaults to true.
 * @param {{ name: string, relativeTo: string }[]} options.variants Virtual module id `virtual:asset-manifest/<name>` and path prefix for each app output folder.
 * @param {string} [options.virtualPrefix] Defaults to `virtual:asset-manifest/`.
 * @param {boolean} [options.verbose] Log one manifest summary per build.
 */
export const assetsManifest = (options) => {
  const {
    targets,
    variants,
    verbose = true,
    virtualPrefix = 'virtual:asset-manifest/',
  } = options;

  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error(
      'assetsManifest: `variants` must be a non-empty array of { name, relativeTo }',
    );
  }

  const targetList = normalizeTargets(targets);
  const variantByName = new Map(
    variants.map((variant) => [variant.name, variant]),
  );
  const targetFilesCache = new Map();
  const targetCacheRebuildIndex = new Map();
  const manifestCache = new Map();
  let hasLoggedDiscoverySummary = false;
  let hasLoggedSummary = false;
  let rebuildIndex = 0;

  const getFilesForTargetWithMeta = (target) => {
    if (target.discoverOnce && targetFilesCache.has(target.path)) {
      const cachedAtBuild = targetCacheRebuildIndex.get(target.path);
      return {
        files: targetFilesCache.get(target.path),
        cached: true,
        cacheHit:
          typeof cachedAtBuild === 'number' && cachedAtBuild < rebuildIndex,
      };
    }

    const files = getFilesPaths(target.absolutePath);
    if (target.discoverOnce) {
      targetFilesCache.set(target.path, files);
      targetCacheRebuildIndex.set(target.path, rebuildIndex);
    }
    return {
      files,
      cached: target.discoverOnce,
      cacheHit: false,
    };
  };

  const getFilesForTarget = (target) => {
    return getFilesForTargetWithMeta(target).files;
  };

  const logDiscoverySummaryOnce = () => {
    if (!verbose || hasLoggedDiscoverySummary) {
      return;
    }

    const targetSummaries = targetList.map((target) => {
      const { files, cached, cacheHit } = getFilesForTargetWithMeta(target);
      let status = '';
      if (cacheHit) {
        status = ' [cacheHit]';
      } else if (cached) {
        status = ' [cached]';
      }
      return `${greenBright(bold(target.path))} with ${greenBright(bold(files.length))} assets${status}`;
    });

    console.log(green('discovered:\n '), green(targetSummaries.join('\n  ')));
    hasLoggedDiscoverySummary = true;
  };

  const buildManifestForRelativeTo = (relativeToDir) => {
    if (manifestCache.has(relativeToDir)) {
      return manifestCache.get(relativeToDir);
    }

    const resolvedRelativeTo = resolve(PROJECT_ROOT, relativeToDir);
    const manifestSet = new Set();
    for (const target of targetList) {
      const allFiles = getFilesForTarget(target);
      for (const file of allFiles) {
        manifestSet.add(relative(resolvedRelativeTo, file));
      }
    }
    const manifest = Array.from(manifestSet);
    manifestCache.set(relativeToDir, manifest);
    return manifest;
  };

  const logManifestSummaryOnce = () => {
    if (!verbose || hasLoggedSummary) {
      return;
    }

    const uniqueFiles = new Set();
    targetList.forEach((target) => {
      const files = getFilesForTarget(target);
      files.forEach((file) => uniqueFiles.add(file));
    });
    const totalFiles = uniqueFiles.size;

    console.log(
      green(`generated:\n `),
      green(`${greenBright(bold('asset manifest'))} with`),
      green(`${greenBright(bold(totalFiles))} assets`),
    );
    hasLoggedSummary = true;
  };

  return {
    name: 'asset-manifest',
    buildStart: {
      sequential: true,
      handler() {
        manifestCache.clear();
        hasLoggedDiscoverySummary = false;
        hasLoggedSummary = false;
        rebuildIndex += 1;
      },
    },
    resolveId(source) {
      if (!source.startsWith(virtualPrefix)) {
        return null;
      }
      const name = source.slice(virtualPrefix.length);
      if (!variantByName.has(name)) {
        return null;
      }
      return `\0asset-manifest:${name}`;
    },
    load(id) {
      if (!id.startsWith('\0asset-manifest:')) {
        return null;
      }
      const name = id.slice('\0asset-manifest:'.length);
      const variant = variantByName.get(name);
      if (!variant) {
        return null;
      }
      const manifest = buildManifestForRelativeTo(variant.relativeTo);
      logDiscoverySummaryOnce();
      logManifestSummaryOnce();

      return `export const ASSET_MANIFEST = ${JSON.stringify(manifest, null, 2)};`;
    },
  };
};

// Get all file paths from a source path
const getFilesPaths = (srcPath) => {
  try {
    if (!existsSync(srcPath)) {
      return [];
    }
    return globSync(resolve(srcPath, '**/*'), GLOB_FILES_OPTIONS);
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

const normalizeTargets = (targets) => {
  const targetItems = Array.isArray(targets) ? targets : [targets];
  if (!targetItems.length) {
    throw new Error(
      'assetsManifest: `targets` must be a non-empty array of { path, discoverOnce? }',
    );
  }

  return targetItems.map((target) => {
    if (
      !target ||
      typeof target.path !== 'string' ||
      target.path.length === 0
    ) {
      throw new Error(
        'assetsManifest: each target must be { path: string, discoverOnce?: boolean }',
      );
    }

    return {
      path: target.path,
      absolutePath: resolve(PROJECT_ROOT, target.path),
      discoverOnce: target.discoverOnce === true,
    };
  });
};
