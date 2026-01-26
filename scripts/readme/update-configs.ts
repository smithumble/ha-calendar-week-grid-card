import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import { THEME_HIDDEN_FIELDS } from '../../src/editor/utils/theme';
import type { CardConfig } from '../../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '../../');
const README_PATH = path.resolve(PROJECT_ROOT, 'README.md');
const DATA_DIR = path.resolve(PROJECT_ROOT, 'dist/demo/assets/data');

const ENTITIES_PRESET_NAME = 'yasno_en';

function getCurrentCommitSha(): string {
  try {
    return execSync('git rev-parse HEAD', {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    }).trim();
  } catch {
    console.warn('Warning: Could not get git commit SHA, using "main"');
    return 'main';
  }
}

function transformConfigForReadme(configContent: string): string {
  try {
    const config = yaml.load(configContent) as CardConfig;

    // Find demo preset and extract its entities
    if (config.entities_presets && Array.isArray(config.entities_presets)) {
      const demoPreset = config.entities_presets.find(
        (preset) => preset.name === ENTITIES_PRESET_NAME,
      );

      if (demoPreset && demoPreset.entities) {
        config.entities = demoPreset.entities;
      }
    }

    // Remove theme hidden fields
    THEME_HIDDEN_FIELDS.forEach((field) => {
      delete config[field as keyof CardConfig];
    });

    // Convert back to YAML
    return yaml.dump(config, {
      lineWidth: -1,
      noRefs: true,
      sortKeys: false,
    });
  } catch (error) {
    console.warn(
      `Failed to transform config: ${error instanceof Error ? error.message : String(error)}`,
    );
    // Return original content if transformation fails
    return configContent;
  }
}

function updateReadmeConfigs(): void {
  let readmeContent = fs.readFileSync(README_PATH, 'utf8');

  // Update image URLs to use commit SHA instead of branch name
  // This ensures old README versions still have accessible images
  const commitSha = getCurrentCommitSha();
  readmeContent = readmeContent.replace(
    /(https:\/\/media\.githubusercontent\.com\/media\/smithumble\/ha-calendar-week-grid-card\/)main(\/media\/images\/[^)]+)/g,
    `$1${commitSha}$2`,
  );

  // Scan all providers in data directory
  if (fs.existsSync(DATA_DIR)) {
    const entries = fs.readdirSync(DATA_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const providerConfigsDir = path.join(DATA_DIR, entry.name, 'configs');
        if (fs.existsSync(providerConfigsDir)) {
          const files = fs.readdirSync(providerConfigsDir);
          for (const file of files) {
            if (file.endsWith('.yaml') || file.endsWith('.yml')) {
              const configName = path.basename(file, path.extname(file));
              const fullConfigName = `${entry.name}/${configName}`;
              const configContent = fs.readFileSync(
                path.join(providerConfigsDir, file),
                'utf8',
              );

              // Markers to look for (support both old format and new format)
              const startMarker = `<!-- CONFIG:${fullConfigName} -->`;
              const altStartMarker = `<!-- CONFIG:${configName} -->`;
              const endMarker = `<!-- END_CONFIG -->`;

              // Try new format first, then fall back to old format
              let regex = new RegExp(
                `(${startMarker})[\\s\\S]*?(${endMarker})`,
                'g',
              );
              let markerFound = readmeContent.match(regex);

              if (!markerFound) {
                regex = new RegExp(
                  `(${altStartMarker})[\\s\\S]*?(${endMarker})`,
                  'g',
                );
                markerFound = readmeContent.match(regex);
              }

              if (markerFound) {
                // Transform config: extract demo preset entities and remove theme hidden fields
                const transformedContent =
                  transformConfigForReadme(configContent);
                let codeBlock =
                  '```yaml\n' + transformedContent.trim() + '\n```';
                const lines = transformedContent.trim().split('\n');

                if (lines.length > 15) {
                  codeBlock = `<details>\n<summary>YAML Configuration</summary>\n\n${codeBlock}\n\n</details>`;
                }

                const newBlock = `${startMarker}\n\n${codeBlock}\n\n${endMarker}`;
                readmeContent = readmeContent.replace(regex, newBlock);
                console.log(`Updated README.md config for ${fullConfigName}`);
              }
            }
          }
        }
      }
    }
  }

  fs.writeFileSync(README_PATH, readmeContent, 'utf8');
  console.log('README.md configs updated successfully.');
}

updateReadmeConfigs();
