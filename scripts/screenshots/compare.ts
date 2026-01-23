import { execSync } from 'child_process';
import { createHash } from 'crypto';
import fs from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

// Constants
const SIMILARITY_THRESHOLD = 1.0; // 100% similarity threshold
const PIXEL_THRESHOLD_DEFAULT = 0.0; // pixelmatch color difference threshold (0-1)

const PIXELMATCH_OPTS = {
  alpha: 1.0,
  diffColor: [255, 0, 0] as [number, number, number],
  diffColorAlt: [0, 255, 0] as [number, number, number],
};

// Types
type CompareResult = {
  passed: boolean;
  similarity: number;
  similarityAtZero?: number;
  currentSize?: number;
  committedSize?: number;
  currentHash?: string;
  committedHash?: string;
  error?: string;
};

// Helpers
const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));
const toPercent = (n: number, decimals = 2): string =>
  (n * 100).toFixed(decimals);
const atZero = (r: CompareResult): number => r.similarityAtZero ?? r.similarity;

/**
 * Get the committed version of a file from git (handles Git LFS)
 */
function getCommittedFile(
  filePath: string,
  gitRef: string = 'HEAD',
): string | null {
  let worktreePath: string | null = null;

  try {
    // Get the git root directory
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      encoding: 'utf-8',
    }).trim();

    // Get relative path from git root
    const absolutePath = path.resolve(filePath);
    const relativePath = path.relative(gitRoot, absolutePath);

    // Check if file exists in git
    try {
      execSync(`git cat-file -e ${gitRef}:${relativePath}`, {
        stdio: 'ignore',
        cwd: gitRoot,
      });
    } catch {
      return null; // File doesn't exist in git
    }

    // Create a temporary git worktree at the specific commit
    // This automatically handles Git LFS files
    worktreePath = path.join(tmpdir(), `git-worktree-${Date.now()}`);
    execSync(`git worktree add "${worktreePath}" ${gitRef}`, {
      cwd: gitRoot,
      stdio: 'ignore',
    });

    const worktreeFile = path.join(worktreePath, relativePath);

    if (!fs.existsSync(worktreeFile)) {
      // Clean up worktree
      execSync(`git worktree remove "${worktreePath}"`, {
        cwd: gitRoot,
        stdio: 'ignore',
      });
      return null;
    }

    // Copy file to a separate temp location (so we can remove worktree)
    const tempPath = path.join(
      tmpdir(),
      `git-${path.basename(filePath)}-${Date.now()}.png`,
    );
    fs.copyFileSync(worktreeFile, tempPath);

    // Clean up worktree
    execSync(`git worktree remove "${worktreePath}"`, {
      cwd: gitRoot,
      stdio: 'ignore',
    });
    worktreePath = null;

    return tempPath;
  } catch (error) {
    // Clean up worktree on error
    if (worktreePath) {
      try {
        const gitRoot = execSync('git rev-parse --show-toplevel', {
          encoding: 'utf-8',
        }).trim();
        execSync(`git worktree remove "${worktreePath}"`, {
          cwd: gitRoot,
          stdio: 'ignore',
        });
      } catch {
        // Ignore cleanup errors
      }
    }
    throw new Error(`Failed to get committed file: ${error}`);
  }
}

/**
 * Compare two images and return similarity percentage
 * @param pixelThreshold - pixelmatch color difference threshold (0-1). Lower = stricter pixel comparison.
 */
async function compareImages(
  imagePath1: string,
  imagePath2: string,
  pixelThreshold: number = PIXEL_THRESHOLD_DEFAULT,
): Promise<{ similarity: number; similarityAtZero: number; diffPng: PNG }> {
  if (!fs.existsSync(imagePath1)) {
    throw new Error(`Image not found: ${imagePath1}`);
  }
  if (!fs.existsSync(imagePath2)) {
    throw new Error(`Image not found: ${imagePath2}`);
  }

  const buffer1 = fs.readFileSync(imagePath1);
  const buffer2 = fs.readFileSync(imagePath2);

  const img1 = PNG.sync.read(buffer1);
  const img2 = PNG.sync.read(buffer2);

  // Ensure images have the same dimensions
  if (img1.width !== img2.width || img1.height !== img2.height) {
    return {
      similarity: 0,
      similarityAtZero: 0,
      diffPng: new PNG({ width: 1, height: 1 }),
    }; // Different dimensions = not similar
  }

  const diff = new PNG({ width: img1.width, height: img1.height });
  const totalPixels = img1.width * img1.height;

  // pixelmatch: threshold = per-pixel color difference (0-1). Lower = stricter; 0 = only exact mismatches.
  const numDiffPixels = pixelmatch(
    img1.data as Uint8Array,
    img2.data as Uint8Array,
    diff.data as Uint8Array,
    img1.width,
    img1.height,
    { ...PIXELMATCH_OPTS, threshold: pixelThreshold },
  );

  const similarity = totalPixels > 0 ? 1 - numDiffPixels / totalPixels : 0;

  let similarityAtZero: number;
  if (pixelThreshold === 0) {
    similarityAtZero = similarity;
  } else {
    const diffDummy = new PNG({ width: img1.width, height: img1.height });
    const numDiffAtZero = pixelmatch(
      img1.data as Uint8Array,
      img2.data as Uint8Array,
      diffDummy.data as Uint8Array,
      img1.width,
      img1.height,
      { ...PIXELMATCH_OPTS, threshold: 0 },
    );
    similarityAtZero = totalPixels > 0 ? 1 - numDiffAtZero / totalPixels : 0;
  }
  similarityAtZero = clamp01(similarityAtZero);

  // Debug output
  if (process.env.DEBUG) {
    console.log(`Image dimensions: ${img1.width}x${img1.height}`);
    console.log(`Pixel threshold: ${pixelThreshold}`);
    console.log(`Total pixels: ${totalPixels}`);
    console.log(`Different pixels: ${numDiffPixels}`);
    console.log(`Similarity: ${(similarity * 100).toFixed(4)}%`);
  }

  return {
    similarity: clamp01(similarity),
    similarityAtZero,
    diffPng: diff,
  };
}

/**
 * Get all PNG files in a directory
 */
function getPngFiles(dirPath: string): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      files.push(...getPngFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const absBytes = Math.abs(bytes);
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(absBytes) / Math.log(k));
  const sign = bytes < 0 ? '-' : '';
  return `${sign}${(absBytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function saveDiffImage(
  diffsPath: string,
  imagePath: string,
  diffPng: PNG,
): void {
  const diffDir = path.resolve(process.cwd(), diffsPath);
  if (!fs.existsSync(diffDir)) fs.mkdirSync(diffDir, { recursive: true });
  const diffPath = path.join(diffDir, `${path.basename(imagePath)}.diff.png`);
  fs.writeFileSync(diffPath, PNG.sync.write(diffPng));
}

function logFileDetails(result: CompareResult): void {
  if (result.currentHash !== undefined)
    console.log(`  Current hash: ${result.currentHash}`);
  if (result.committedHash !== undefined)
    console.log(`  Committed hash: ${result.committedHash}`);
  if (result.currentSize !== undefined)
    console.log(`  Current size: ${formatFileSize(result.currentSize)}`);
  if (result.committedSize !== undefined) {
    console.log(`  Committed size: ${formatFileSize(result.committedSize)}`);
    if (
      result.currentSize !== undefined &&
      result.currentSize !== result.committedSize
    ) {
      const diff = result.currentSize - result.committedSize;
      const sign = diff > 0 ? '+' : '';
      console.log(
        `  Size difference: ${formatFileSize(diff)} (${sign}${((diff / result.committedSize) * 100).toFixed(2)}%)`,
      );
    }
  }
}

function formatComparisonResult(
  result: CompareResult,
  threshold: number,
): string {
  if (result.error) {
    return `  ⚠️  ${result.error}`;
  }

  const isByteIdentical =
    result.currentHash !== undefined &&
    result.committedHash !== undefined &&
    result.currentHash === result.committedHash;

  if (isByteIdentical) {
    return '  ✓ Identical (100% match, byte-identical)';
  }

  if (result.similarity === 1.0) {
    const atZeroPercent = toPercent(atZero(result));
    return `  ✓ Similar (100% match, ${atZeroPercent}% exact match)`;
  }

  const similarityPercent = toPercent(result.similarity);
  const thresholdPercent = toPercent(threshold);
  const atZeroPercent = toPercent(atZero(result));

  if (result.passed) {
    return `  ✓ Passed (${similarityPercent}% >= ${thresholdPercent}%, ${atZeroPercent}% exact match)`;
  } else {
    return `  ✗ Failed (${similarityPercent}% < ${thresholdPercent}%, ${atZeroPercent}% exact match)`;
  }
}

/**
 * Compare a single image with its committed version
 */
async function compareSingleImage(
  imagePath: string,
  threshold: number,
  pixelThreshold: number,
  gitRef: string,
  diffsPath: string | null,
): Promise<CompareResult> {
  let committedImagePath: string | null = null;

  try {
    const currentSize = fs.statSync(imagePath).size;
    const currentHash = createHash('md5')
      .update(fs.readFileSync(imagePath))
      .digest('hex');

    committedImagePath = getCommittedFile(imagePath, gitRef);

    if (!committedImagePath) {
      return {
        passed: true, // New files are considered "passed"
        similarity: 0,
        currentSize,
        currentHash,
        error: 'No committed version found in git (new file)',
      };
    }

    const committedSize = fs.statSync(committedImagePath).size;
    const committedHash = createHash('md5')
      .update(fs.readFileSync(committedImagePath))
      .digest('hex');

    // Quick check: if files are identical (same checksum), similarity is 100%
    if (currentHash === committedHash) {
      return {
        passed: true,
        similarity: 1.0,
        currentSize,
        committedSize,
        currentHash,
        committedHash,
      };
    }

    const { similarity, similarityAtZero, diffPng } = await compareImages(
      imagePath,
      committedImagePath,
      pixelThreshold,
    );
    const passed = similarity >= threshold;
    if (!passed && diffsPath) saveDiffImage(diffsPath, imagePath, diffPng);

    return {
      passed,
      similarity,
      similarityAtZero,
      currentSize,
      committedSize,
      currentHash,
      committedHash,
    };
  } catch (error) {
    const currentSize = fs.existsSync(imagePath)
      ? fs.statSync(imagePath).size
      : undefined;
    const currentHash = fs.existsSync(imagePath)
      ? createHash('md5').update(fs.readFileSync(imagePath)).digest('hex')
      : undefined;

    return {
      passed: false,
      similarity: 0,
      currentSize,
      currentHash,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    // Clean up temporary file
    if (committedImagePath && fs.existsSync(committedImagePath)) {
      fs.unlinkSync(committedImagePath);
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): {
  path: string;
  threshold: number;
  pixelThreshold: number;
  gitRef: string;
  diffsPath: string | null;
} {
  const args = process.argv.slice(2);
  let inputPath: string | null = null;
  let threshold: number = SIMILARITY_THRESHOLD;
  let pixelThreshold: number = PIXEL_THRESHOLD_DEFAULT;
  let gitRef: string = 'HEAD';
  let diffsPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--pixel-threshold' || arg === '-p') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Error: --pixel-threshold requires a value`);
        process.exit(1);
      }
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0 || parsed > 1) {
        console.error(
          `Error: Pixel threshold must be a number between 0 and 1`,
        );
        process.exit(1);
      }
      pixelThreshold = parsed;
      i++; // Skip next argument as it's the value
    } else if (arg === '--threshold' || arg === '-t') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Error: --threshold requires a value`);
        process.exit(1);
      }
      const parsed = parseFloat(value);
      if (isNaN(parsed) || parsed < 0 || parsed > 1) {
        console.error(`Error: Threshold must be a number between 0 and 1`);
        process.exit(1);
      }
      threshold = parsed;
      i++; // Skip next argument as it's the value
    } else if (arg === '--git-ref' || arg === '-r') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Error: --git-ref requires a value`);
        process.exit(1);
      }
      gitRef = value;
      i++; // Skip next argument as it's the value
    } else if (arg === '--diffs' || arg === '-d') {
      const value = args[i + 1];
      if (!value || value.startsWith('-')) {
        console.error(`Error: --diffs requires a value`);
        process.exit(1);
      }
      diffsPath = value;
      i++; // Skip next argument as it's the value
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: tsx scripts/screenshots/compare.ts <path> [options]');
      console.log('');
      console.log('Arguments:');
      console.log(
        '  path                    Path to image file or folder containing images',
      );
      console.log('');
      console.log('Options:');
      console.log(
        `  --threshold, -t <value>  Similarity threshold (0-1, default: ${SIMILARITY_THRESHOLD})`,
      );
      console.log(
        '  --pixel-threshold, -p <value>  Pixelmatch color difference threshold (0-1, default: 0). Lower = stricter.',
      );
      console.log('  --git-ref, -r <ref>     Git reference (default: HEAD)');
      console.log(
        '  --diffs, -d <path>       Directory to save diff images (optional, disabled if not set)',
      );
      console.log('  --help, -h             Show this help message');
      console.log('');
      console.log('Examples:');
      console.log('  tsx scripts/screenshots/compare.ts media/images/');
      console.log(
        '  tsx scripts/screenshots/compare.ts media/images/ --threshold 0.98',
      );
      console.log(
        '  tsx scripts/screenshots/compare.ts media/images/ -p 0.1 --threshold 0.95',
      );
      console.log(
        '  tsx scripts/screenshots/compare.ts media/images/ -t 0.95 -r origin/main',
      );
      console.log(
        '  tsx scripts/screenshots/compare.ts media/images/ --diffs ./my-diffs',
      );
      process.exit(0);
    } else if (!arg.startsWith('-')) {
      // Positional argument (path)
      if (inputPath === null) {
        inputPath = arg;
      } else if (
        threshold === SIMILARITY_THRESHOLD &&
        !isNaN(parseFloat(arg))
      ) {
        // Legacy: second positional argument as threshold
        threshold = parseFloat(arg);
      } else if (gitRef === 'HEAD' && !arg.startsWith('-')) {
        // Legacy: third positional argument as git-ref
        gitRef = arg;
      }
    }
  }

  if (!inputPath) {
    console.error('Error: Path argument is required');
    console.error(
      'Usage: tsx scripts/screenshots/compare.ts <path> [--threshold <value>] [--git-ref <ref>]',
    );
    console.error('Use --help for more information');
    process.exit(1);
  }

  return {
    path: inputPath,
    threshold,
    pixelThreshold,
    gitRef,
    diffsPath,
  };
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const {
    path: inputPath,
    threshold,
    pixelThreshold,
    gitRef,
    diffsPath,
  } = parseArgs();

  const resolvedPath = path.resolve(inputPath);

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Error: Path not found: ${resolvedPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(resolvedPath);
  let imageFiles: string[] = [];

  if (stats.isFile()) {
    // Single file
    if (!resolvedPath.toLowerCase().endsWith('.png')) {
      console.error(`Error: File is not a PNG image: ${resolvedPath}`);
      process.exit(1);
    }
    imageFiles = [resolvedPath];
  } else if (stats.isDirectory()) {
    // Directory - find all PNG files
    imageFiles = getPngFiles(resolvedPath);
    if (imageFiles.length === 0) {
      console.error(`Error: No PNG images found in directory: ${resolvedPath}`);
      process.exit(1);
    }
  } else {
    console.error(
      `Error: Path is neither a file nor a directory: ${resolvedPath}`,
    );
    process.exit(1);
  }

  console.log(`Found ${imageFiles.length} image(s) to compare`);
  console.log(`Threshold: ${toPercent(threshold)}%`);
  console.log(`Pixel threshold: ${toPercent(pixelThreshold)}%`);
  console.log(`Git reference: ${gitRef}`);
  if (diffsPath) {
    const diffDir = path.resolve(process.cwd(), diffsPath);
    console.log(`Diffs path: ${diffDir}`);
    if (fs.existsSync(diffDir)) {
      fs.rmSync(diffDir, { recursive: true });
    }
  } else {
    console.log('Diffs: disabled');
  }
  console.log('');

  const results: Array<{ file: string } & CompareResult> = [];

  for (let i = 0; i < imageFiles.length; i++) {
    const imagePath = imageFiles[i];
    const relativePath = path.relative(process.cwd(), imagePath);
    console.log(`[${i + 1}/${imageFiles.length}] ${relativePath}`);

    const result = await compareSingleImage(
      imagePath,
      threshold,
      pixelThreshold,
      gitRef,
      diffsPath,
    );
    results.push({ file: imagePath, ...result });

    logFileDetails(result);
    console.log(formatComparisonResult(result, threshold));
    console.log('');
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('='.repeat(60));
  console.log('Summary:');
  console.log(`  Total: ${results.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  console.log('='.repeat(60));

  if (failed > 0) {
    console.log('\nFailed images:');
    for (const result of results) {
      if (!result.passed) {
        const relativePath = path.relative(process.cwd(), result.file);
        console.log(`  ✗ ${relativePath} (${toPercent(result.similarity)}%)`);
        if (result.error) {
          console.log(`    Error: ${result.error}`);
        }
      }
    }
    process.exit(1);
  } else {
    console.log('\n✓ All images passed comparison');
    process.exit(0);
  }
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
