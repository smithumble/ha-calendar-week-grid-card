import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const README_PATH = path.resolve(PROJECT_ROOT, 'README.md');

interface ImageUrl {
  fullUrl: string;
  filePath: string;
  matchIndex: number;
}

function findImageUrls(readmeContent: string): ImageUrl[] {
  const imageUrlRegex =
    /https:\/\/media\.githubusercontent\.com\/media\/smithumble\/ha-calendar-week-grid-card\/(?:[a-f0-9]{40}|main)\/(media\/images\/[^)]+\.png)/g;
  const urls: ImageUrl[] = [];
  let match;

  while ((match = imageUrlRegex.exec(readmeContent)) !== null) {
    urls.push({
      fullUrl: match[0],
      filePath: match[1],
      matchIndex: match.index,
    });
  }

  return urls;
}

function isFileCommitted(filePath: string): boolean {
  try {
    // Check if file is tracked by git
    const trackedFiles = execSync('git ls-files', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!trackedFiles.includes(filePath)) {
      return false;
    }

    // Check if file has uncommitted changes
    // git diff --quiet exits with 0 if no differences, non-zero if there are differences
    try {
      execSync(`git diff --quiet HEAD -- ${filePath}`, {
        cwd: PROJECT_ROOT,
        stdio: 'ignore',
      });
      // No diff means file matches HEAD, so it's committed
      return true;
    } catch {
      // File has differences from HEAD, so it's not committed
      return false;
    }
  } catch (error) {
    console.error(`Error checking file status for ${filePath}:`, error);
    return false;
  }
}

function getCommitHashForFile(filePath: string): string {
  try {
    // Get the commit hash of the first commit after which the file was not updated
    // This is the most recent commit where the file was modified
    // Since we've verified the file matches HEAD, this is the commit containing the current version

    // Use -1 to get only the most recent commit that modified the file
    // This finds the commit where the current version of the file exists
    const commitHash = execSync(`git log -1 --format=%H -- ${filePath}`, {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    }).trim();

    if (!commitHash) {
      throw new Error(
        `Could not find the commit where ${filePath} was last modified`,
      );
    }

    return commitHash;
  } catch (error) {
    throw new Error(
      `Failed to get commit hash for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function updateImageUrls(): void {
  const readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const imageUrls = findImageUrls(readmeContent);

  if (imageUrls.length === 0) {
    console.log('No image URLs found in README.md');
    return;
  }

  console.log(`Found ${imageUrls.length} image URL(s) in README.md`);

  let updatedContent = readmeContent;
  let updatedCount = 0;
  let upToDateCount = 0;
  const errors: string[] = [];

  // Process URLs in reverse order to preserve indices
  for (let i = imageUrls.length - 1; i >= 0; i--) {
    const imageUrl = imageUrls[i];
    const fullPath = path.join(PROJECT_ROOT, imageUrl.filePath);

    console.log(`\nProcessing: ${imageUrl.filePath}`);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      errors.push(`File does not exist: ${imageUrl.filePath}`);
      console.error(`  ❌ File does not exist: ${imageUrl.filePath}`);
      continue;
    }

    // Check if file is committed
    if (!isFileCommitted(imageUrl.filePath)) {
      errors.push(
        `File is not committed (may have uncommitted changes): ${imageUrl.filePath}`,
      );
      console.error(`  ❌ File is not committed: ${imageUrl.filePath}`);
      continue;
    }

    // Get commit hash
    try {
      const commitHash = getCommitHashForFile(imageUrl.filePath);
      console.log(`  ✓ Commit hash: ${commitHash}`);

      // Update URL
      const newUrl = `https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/${commitHash}/${imageUrl.filePath}`;

      // Check if URL needs to be updated
      if (imageUrl.fullUrl === newUrl) {
        console.log(`  ✓ URL already up to date`);
        upToDateCount++;
        continue;
      }

      const urlRegex = new RegExp(
        imageUrl.fullUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g',
      );

      if (updatedContent.match(urlRegex)) {
        updatedContent = updatedContent.replace(urlRegex, newUrl);
        updatedCount++;
        console.log(`  ✓ Updated URL`);
      } else {
        console.warn(
          `  ⚠️  URL not found in content (may have been already updated)`,
        );
      }
    } catch (error) {
      const errorMsg = `Failed to get commit hash for ${imageUrl.filePath}: ${error instanceof Error ? error.message : String(error)}`;
      errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }

  // Write updated content
  if (updatedCount > 0) {
    fs.writeFileSync(README_PATH, updatedContent, 'utf8');
    console.log(
      `\n✓ Updated ${updatedCount} image URL(s), ${upToDateCount} are already up to date`,
    );
  } else if (
    upToDateCount > 0 &&
    upToDateCount === imageUrls.length - errors.length
  ) {
    console.log(`\n✓ All ${upToDateCount} image URL(s) are already up to date`);
  } else {
    console.log('\n⚠️  No URLs were updated');
  }

  // Report errors
  if (errors.length > 0) {
    console.error('\n❌ Errors encountered:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
}

updateImageUrls();
