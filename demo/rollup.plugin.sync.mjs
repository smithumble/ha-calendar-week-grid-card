import {
  existsSync,
  mkdirSync,
  rmSync,
  rmdirSync,
  readdirSync,
  statSync,
  copyFileSync,
  writeFileSync,
} from 'fs';
import { resolve, relative, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { green, greenBright, red, redBright, bold } from 'colorette';
import { globSync } from 'glob';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

const ROLLUP_WATCH = !!process.env.ROLLUP_WATCH;
const GLOB_FILES_OPTIONS = {
  absolute: true,
  nodir: true,
};
const SYNC_POLL_INTERVAL_MS = 700;
const REBUILD_TRIGGER_DEBOUNCE_MS = 120;
const SHOW_SYNCED_FILE_NAMES_LIMIT = 10;

/**
 * Rollup plugin: on each `buildStart`, copies `src` to `dest` (file or tree), removes destination files no longer in the expected set.
 * @param {object} options
 * @param {{ src: string, dest: string, syncOnce?: boolean }[]} options.targets Copy specs under PROJECT_ROOT (`src` path or glob; `dest` directory; optional `syncOnce` for watch mode).
 * @param {boolean} [options.verbose] Log watched roots, copy count, and pruned files.
 * @param {string} options.rebuildTriggerPath Path under PROJECT_ROOT to a file touched when background watch detects changes, forcing Rollup/Vite rebuild.
 */
export const sync = (options) => {
  const { rebuildTriggerPath: rebuildTriggerPathOption } = options;
  if (!rebuildTriggerPathOption) {
    throw new Error('sync: `rebuildTriggerPath` is required');
  }
  let syncOnceDoneInWatch = false;
  let pollTimer = null;
  let rebuildTriggerDebounceTimer = null;
  let previousRecurringSourcesSignature = '';
  const rebuildTriggerPath = resolve(PROJECT_ROOT, rebuildTriggerPathOption);
  const toProjectRelativePath = (absolutePath) =>
    relative(PROJECT_ROOT, absolutePath);
  const touchRebuildTrigger = () => {
    mkdirSync(dirname(rebuildTriggerPath), { recursive: true });
    writeFileSync(rebuildTriggerPath, String(Date.now()));
  };
  const scheduleRebuildTriggerTouch = () => {
    if (rebuildTriggerDebounceTimer) {
      return;
    }
    rebuildTriggerDebounceTimer = setTimeout(() => {
      rebuildTriggerDebounceTimer = null;
      touchRebuildTrigger();
    }, REBUILD_TRIGGER_DEBOUNCE_MS);
  };

  const runSync = ({ targetList, verbose = false }) => {
    const resolvedTargets = targetList.map((target) =>
      resolveCopyTarget(target),
    );
    const allOutputFiles = resolvedTargets.flatMap(
      (target) => target.outputFiles,
    );
    const expectedFiles = collectExpectedDestinationFiles(allOutputFiles);
    const copiedFiles = [];
    const removedFiles = [];

    for (const { sourceFilePath, destinationFilePath } of allOutputFiles) {
      if (shouldCopyFile(sourceFilePath, destinationFilePath)) {
        mkdirSync(dirname(destinationFilePath), { recursive: true });
        copyFileSync(sourceFilePath, destinationFilePath);
        copiedFiles.push(toProjectRelativePath(destinationFilePath));
      }
    }

    for (const { destinationRootPath } of resolvedTargets) {
      if (!existsSync(destinationRootPath)) {
        continue;
      }

      const existingDestinationFiles = globSync(
        resolve(destinationRootPath, '**/*'),
        GLOB_FILES_OPTIONS,
      );

      for (const destinationFilePath of existingDestinationFiles) {
        if (!expectedFiles.has(destinationFilePath)) {
          rmSync(destinationFilePath, { force: true });
          removeEmptyDirectories(
            dirname(destinationFilePath),
            destinationRootPath,
          );
          removedFiles.push(toProjectRelativePath(destinationFilePath));
        }
      }
    }

    logSyncSummary({ verbose, targets: targetList, copiedFiles, removedFiles });

    return {
      copiedFiles,
      removedFiles,
      changed: copiedFiles.length > 0 || removedFiles.length > 0,
    };
  };

  return {
    name: 'sync-targets',
    buildStart: {
      sequential: true,
      handler() {
        const { targets, verbose = false } = options;
        const isWatchMode = this.meta.watchMode ?? ROLLUP_WATCH;
        const targetList = normalizeTargets(targets);
        const { syncOnceTargets, recurringTargets } =
          partitionTargetsBySyncPolicy(targetList);
        let buildStartTargets = targetList;
        if (isWatchMode && syncOnceDoneInWatch) {
          buildStartTargets = recurringTargets;
        }
        if (rebuildTriggerPath) {
          this.addWatchFile(rebuildTriggerPath);
        }
        runSync({ targetList: buildStartTargets, verbose });
        if (isWatchMode && recurringTargets.length > 0) {
          // Keep the poller aligned with source changes already handled by Rollup
          // so it only triggers rebuilds for out-of-band file updates.
          previousRecurringSourcesSignature =
            getRecurringSourcesSignature(recurringTargets);
        }

        if (isWatchMode && recurringTargets.length > 0 && !pollTimer) {
          pollTimer = setInterval(() => {
            const nextRecurringSourcesSignature =
              getRecurringSourcesSignature(recurringTargets);
            if (
              nextRecurringSourcesSignature ===
              previousRecurringSourcesSignature
            ) {
              return;
            }
            previousRecurringSourcesSignature = nextRecurringSourcesSignature;
            if (verbose) {
              console.log(
                green(
                  'background watch detected source changes; scheduling rebuild',
                ),
              );
            }
            scheduleRebuildTriggerTouch();
          }, SYNC_POLL_INTERVAL_MS);
        }

        if (isWatchMode && syncOnceTargets.length > 0) {
          syncOnceDoneInWatch = true;
        }
      },
    },
    closeWatcher() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (rebuildTriggerDebounceTimer) {
        clearTimeout(rebuildTriggerDebounceTimer);
        rebuildTriggerDebounceTimer = null;
      }
      if (rebuildTriggerPath) {
        rmSync(rebuildTriggerPath, { force: true });
      }
    },
  };
};

const normalizeTargets = (targets) => {
  if (!Array.isArray(targets)) {
    throw new Error('sync: `targets` must be an array');
  }

  return targets.map((target) => ({
    ...target,
    syncOnce: target.syncOnce === true,
  }));
};

const partitionTargetsBySyncPolicy = (targetList) => ({
  syncOnceTargets: targetList.filter((target) => target.syncOnce),
  recurringTargets: targetList.filter((target) => !target.syncOnce),
});

const collectExpectedDestinationFiles = (outputFiles) => {
  const expectedFiles = new Set();
  for (const { destinationFilePath } of outputFiles) {
    expectedFiles.add(destinationFilePath);
  }
  return expectedFiles;
};

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

const shouldCopyFile = (sourceFilePath, destinationFilePath) => {
  if (!existsSync(destinationFilePath)) {
    return true;
  }

  try {
    const sourceStats = statSync(sourceFilePath);
    const destinationStats = statSync(destinationFilePath);
    return (
      sourceStats.size !== destinationStats.size ||
      sourceStats.mtimeMs > destinationStats.mtimeMs
    );
  } catch {
    return true;
  }
};

const logSyncSummary = ({ verbose, targets, copiedFiles, removedFiles }) => {
  if (!verbose) {
    return;
  }

  if (targets.length > 0) {
    const targetLines = targets.map((target) => {
      const syncOnceSuffix = target.syncOnce ? ' [syncOnce]' : '';
      return `${target.src} -> ${target.dest}${syncOnceSuffix}`;
    });
    console.log(
      green(`sync:\n  ${greenBright(bold(targetLines.join('\n  ')))}`),
    );
  }
  if (
    copiedFiles.length > 0 &&
    copiedFiles.length < SHOW_SYNCED_FILE_NAMES_LIMIT
  ) {
    console.log(
      green(`synced:\n  ${greenBright(bold(copiedFiles.join('\n  ')))}`),
    );
  } else {
    console.log(
      green(`synced ${greenBright(bold(String(copiedFiles.length)))} files`),
    );
  }
  if (
    removedFiles.length > 0 &&
    removedFiles.length < SHOW_SYNCED_FILE_NAMES_LIMIT
  ) {
    console.log(
      red(`removed:\n  ${redBright(bold(removedFiles.join('\n  ')))}`),
    );
  } else if (removedFiles.length > 0) {
    console.log(
      red(`removed ${redBright(bold(String(removedFiles.length)))} files`),
    );
  }
};

const resolveCopyTarget = (target) => {
  if (hasGlobMagic(target.src)) {
    const absolutePattern = resolve(PROJECT_ROOT, target.src);
    const sourceFiles = globSync(absolutePattern, GLOB_FILES_OPTIONS);
    const destinationPath = resolve(PROJECT_ROOT, target.dest);
    const globBasePath = resolve(PROJECT_ROOT, getGlobBasePath(target.src));

    const outputFiles = sourceFiles.map((sourceFilePath) => ({
      sourceFilePath,
      destinationFilePath: resolve(
        destinationPath,
        relative(globBasePath, sourceFilePath),
      ),
    }));

    return {
      sourcePath: absolutePattern,
      destinationRootPath: destinationPath,
      outputFiles,
    };
  }

  const sourcePath = resolve(PROJECT_ROOT, target.src);
  const destinationPath = resolve(PROJECT_ROOT, target.dest);
  const sourceExists = existsSync(sourcePath);
  const sourceStats = sourceExists ? statSync(sourcePath) : null;
  const sourceName = basename(sourcePath);

  if (!sourceExists || !sourceStats) {
    return {
      sourcePath,
      destinationRootPath: resolve(destinationPath, sourceName || ''),
      outputFiles: [],
    };
  }

  if (sourceStats.isDirectory()) {
    const destinationRootPath = resolve(destinationPath, sourceName || '');
    const sourceFiles = globSync(
      resolve(sourcePath, '**/*'),
      GLOB_FILES_OPTIONS,
    );

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
          basename(sourcePath) || '',
        ),
      },
    ],
  };
};

const hasGlobMagic = (inputPath) => /[*?[\]{}()]/.test(inputPath);

const getGlobBasePath = (globPath) => {
  const pathParts = globPath.split(/[/\\]+/);
  const baseParts = [];

  for (const pathPart of pathParts) {
    if (hasGlobMagic(pathPart)) {
      break;
    }
    baseParts.push(pathPart);
  }

  return baseParts.length > 0 ? baseParts.join('/') : '.';
};

const getRecurringSourcesSignature = (targetList) => {
  const sourceFilePaths = new Set();
  for (const target of targetList) {
    const resolvedTarget = resolveCopyTarget(target);
    for (const { sourceFilePath } of resolvedTarget.outputFiles) {
      sourceFilePaths.add(sourceFilePath);
    }
  }

  return Array.from(sourceFilePaths)
    .sort()
    .map((sourceFilePath) => {
      try {
        const sourceStats = statSync(sourceFilePath);
        return `${sourceFilePath}:${sourceStats.size}:${sourceStats.mtimeMs}`;
      } catch {
        return `${sourceFilePath}:missing`;
      }
    })
    .join('\n');
};
