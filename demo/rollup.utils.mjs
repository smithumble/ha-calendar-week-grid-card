import { cpSync, rmSync, existsSync } from 'fs';
import { resolve, relative } from 'path';
import glob from 'glob';

// Shared utility function for copying assets
export const copyAsset = (srcPath, destPath, projectRoot, force = true) => {
  try {
    if (!existsSync(srcPath)) {
      console.warn(
        `✗ Source path does not exist: ${relative(projectRoot, srcPath)}`,
      );
      return;
    }

    // Remove existing destination folder if it exists
    if (existsSync(destPath)) {
      if (force) {
        rmSync(destPath, { recursive: true, force: true });
      } else {
        console.log(
          `✓ Skipping copy of ${relative(projectRoot, destPath)}, already exists`,
        );
        return;
      }
    }

    // Copy the folder
    cpSync(srcPath, destPath, { recursive: true });

    console.log(
      `✓ Copied ${relative(projectRoot, srcPath)} to ${relative(projectRoot, destPath)}`,
    );
  } catch (error) {
    console.error(
      `✗ Failed to copy ${relative(projectRoot, srcPath)} to ${relative(projectRoot, destPath)}:`,
      error,
    );
  }
};

// Get all file paths from a source path
export const getFilesPaths = (srcPath, projectRoot) => {
  try {
    if (!existsSync(srcPath)) {
      return [];
    }
    return glob.sync(resolve(srcPath, '**/*'), {
      absolute: true,
      nodir: true,
    });
  } catch (error) {
    console.warn(
      `✗ Failed to get files from ${relative(projectRoot, srcPath)}:`,
      error,
    );
    return [];
  }
};

// Shared utility function for watching source files
export const watchSourceFiles = (plugin, sourcePath, projectRoot) => {
  try {
    if (existsSync(sourcePath)) {
      const sourceFiles = getFilesPaths(sourcePath, projectRoot);
      for (const file of sourceFiles) {
        plugin.addWatchFile(file);
      }
      plugin.addWatchFile(sourcePath);
    }
  } catch (error) {
    console.warn(
      `✗ Failed to watch ${relative(projectRoot, sourcePath)}:`,
      error,
    );
  }
};
