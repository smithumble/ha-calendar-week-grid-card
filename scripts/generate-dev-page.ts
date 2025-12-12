import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDevPageHTML } from './utils/renderers/dev-page';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_PATH = path.resolve(__dirname, '../dist/index.html');

(async () => {
  try {
    console.log('Generating dev page...');

    const html = generateDevPageHTML({
      cardScriptPath: './calendar-week-grid-card.js',
    });

    fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
    fs.writeFileSync(OUTPUT_PATH, html, 'utf8');
    console.log(`Dev page generated: ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('Error generating dev page:', error);
    process.exit(1);
  }
})();
