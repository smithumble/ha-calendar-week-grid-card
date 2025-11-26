import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const README_PATH = path.resolve(__dirname, '../README.md');
const CONFIGS_DIR = path.resolve(__dirname, '../media/configs');

function updateReadme() {
  let readmeContent = fs.readFileSync(README_PATH, 'utf8');
  const files = fs.readdirSync(CONFIGS_DIR);

  files.forEach(file => {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const configName = path.basename(file, path.extname(file));
      const configContent = fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8');
      
      // Markers to look for
      const startMarker = `<!-- CONFIG:${configName} -->`;
      const endMarker = `<!-- END_CONFIG -->`;
      
      // Regex to match content between markers
      // We match starting marker, anything in between, and the NEXT end marker.
      // The logic assumes markers are properly paired and nested markers don't exist (which is true).
      // We need to be careful about which END_CONFIG we match.
      // Since we iterate by config name, we look for the specific start marker.
      
      const regex = new RegExp(`(${startMarker})[\\s\\S]*?(${endMarker})`, 'g');
      
      if (readmeContent.match(regex)) {
        const newBlock = `${startMarker}\n\`\`\`yaml\n${configContent.trim()}\n\`\`\`\n${endMarker}`;
        readmeContent = readmeContent.replace(regex, newBlock);
        console.log(`Updated config for ${configName}`);
      } else {
        console.log(`Marker for ${configName} not found in README.md (Skipping)`);
      }
    }
  });

  fs.writeFileSync(README_PATH, readmeContent, 'utf8');
  console.log('README.md updated successfully.');
}

updateReadme();

