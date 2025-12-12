import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { generateDevPageHTML } from './utils/renderers/dev-page';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.resolve(__dirname, '../assets/configs/image.yaml');
const OUTPUT_PATH = path.resolve(__dirname, '../dist/index.html');

(async () => {
  try {
    console.log('Generating dev page...');

    if (!fs.existsSync(CONFIG_PATH)) {
      throw new Error(`Config file not found: ${CONFIG_PATH}`);
    }

    const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) as any;
    const html = generateDevPageHTML({
      config,
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
