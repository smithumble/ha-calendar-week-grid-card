import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MDI_SVG_DIR = path.resolve(__dirname, '../../node_modules/@mdi/svg/svg');

/**
 * Load all available icons from @mdi/svg package
 */
export function loadIcons(): Record<string, string> {
  const iconMap: Record<string, string> = {};
  
  if (!fs.existsSync(MDI_SVG_DIR)) {
    console.warn(`MDI SVG directory not found: ${MDI_SVG_DIR}`);
    return iconMap;
  }

  const files = fs.readdirSync(MDI_SVG_DIR);
  for (const file of files) {
    if (file.endsWith('.svg')) {
      const iconName = file.replace('.svg', '');
      const iconKey = `mdi/${iconName}`;
      const svgPath = path.join(MDI_SVG_DIR, file);
      
      try {
        iconMap[iconKey] = fs.readFileSync(svgPath, 'utf8');
      } catch (error) {
        console.warn(`Failed to load icon ${iconKey}:`, error);
      }
    }
  }

  return iconMap;
}
