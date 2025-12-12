import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const README_PATH = path.resolve(__dirname, '../README.md');
const CONFIGS_DIR = path.resolve(__dirname, '../assets/configs');

function updateReadme(): void {
  let readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const files = fs.readdirSync(CONFIGS_DIR);

  files.forEach((file: string) => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const configName = path.basename(file, path.extname(file));
      const configContent = fs.readFileSync(
        path.join(CONFIGS_DIR, file),
        'utf8',
      );

      // Markers to look for
      const startMarker = `<!-- CONFIG:${configName} -->`;
      const endMarker = `<!-- END_CONFIG -->`;

      // Regex to match content between markers
      const regex = new RegExp(`(${startMarker})[\\s\\S]*?(${endMarker})`, 'g');

      if (readmeContent.match(regex)) {
        let codeBlock = '```yaml\n' + configContent.trim() + '\n```';
        const lines = configContent.trim().split('\n');

        if (lines.length > 15) {
          codeBlock = `<details>\n<summary>Configuration</summary>\n\n${codeBlock}\n\n</details>`;
        }

        const newBlock = `${startMarker}\n\n${codeBlock}\n\n${endMarker}`;
        readmeContent = readmeContent.replace(regex, newBlock);
        console.log(`Updated config for ${configName}`);
      } else {
        console.log(
          `Marker for ${configName} not found in README.md (Skipping)`,
        );
      }
    }
  });

  fs.writeFileSync(README_PATH, readmeContent, 'utf8');
  console.log('README.md updated successfully.');
}

updateReadme();
