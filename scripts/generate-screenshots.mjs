import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_PATH = path.resolve(__dirname, '../dist/calendar-week-grid-card.js');
const OUTPUT_DIR = path.resolve(__dirname, '../media/images');
const CONFIGS_DIR = path.resolve(__dirname, '../media/configs');
const DATA_DIR = path.resolve(__dirname, '../media/data');

// Fixed date: Monday, May 20, 2024
const MOCK_DATE_STR = '2024-05-20T11:38:00';

// Helper to load configs
function loadConfigs() {
  const files = fs.readdirSync(CONFIGS_DIR);
  return files
    .filter(file => file.endsWith('.yaml') || file.endsWith('.yml'))
    .map(file => {
      const name = path.basename(file, path.extname(file));
      const content = fs.readFileSync(path.join(CONFIGS_DIR, file), 'utf8');
      return {
        name,
        config: yaml.load(content),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name)); // optional sorting
}

const CONFIGS = loadConfigs();

// Mock events based on the Monday, May 20, 2024 start date
const getMockEvents = () => {
  const baseDate = new Date(MOCK_DATE_STR);
  // Reset to start of the week (Monday) just in case
  // May 20, 2024 is a Monday.
  baseDate.setHours(0, 0, 0, 0);
  
  const events = [];
  
  // Load data files
  const plannedRaw = fs.readFileSync(path.join(DATA_DIR, 'planned_1.yaml'), 'utf8');
  const probableRaw = fs.readFileSync(path.join(DATA_DIR, 'probable_1.yaml'), 'utf8');
  
  const plannedData = yaml.load(plannedRaw);
  const probableData = yaml.load(probableRaw);

  const GROUP_ID = '6.1';

  // Extract group data
  const plannedGroup = plannedData[GROUP_ID];
  // Probable structure: ["25"]["dsos"]["902"]["groups"]["6.1"]["slots"]
  // We need to safely access this path or assume it exists based on file inspection
  const probableGroupSlots = probableData['25']?.['dsos']?.['902']?.['groups']?.[GROUP_ID]?.['slots'];

  if (!plannedGroup || !probableGroupSlots) {
      console.error('Could not find group data for', GROUP_ID);
      return [];
  }

  // Iterate 7 days of the week (0=Mon, 6=Sun)
  for (let day = 0; day < 7; day++) {
      const dayDate = new Date(baseDate);
      dayDate.setDate(baseDate.getDate() + day);

      // Logic:
      // Days 0-1: Do not have planned data in our map (since map keys are 2 (Wed) and 3 (Thu) based on real dates)
      // Wait, let's re-evaluate the mapping.
      // Real Data: Today=Wed (2), Tomorrow=Thu (3).
      // Mock Data: Mon (0) -> Sun (6).
      
      // The user request "use planned for today and tomorrow" implies we should map 
      // the "today" and "tomorrow" data from the files to specific days in our mock week.
      // Let's assume we want to showcase "Today" and "Tomorrow" at the start of our mock week?
      // OR, if the user just means "where available", we use planned.
      
      // Interpretation:
      // "Today" in the data is Wednesday.
      // "Tomorrow" in the data is Thursday.
      // Let's map:
      // Mock Mon (Day 0) <- Data Today (Wed)
      // Mock Tue (Day 1) <- Data Tomorrow (Thu)
      // Mock Wed-Sun (Day 2-6) <- Data Probable (Fri-Tue equiv?)

      // Let's align the data so "Today" corresponds to the first day of our mock week (Monday).
      
      let slots = [];
      let source = '';
      let dayStatus = '';

      if (day === 0) {
          // Day 0 (Mon) gets "Today" data (Planned)
          slots = plannedGroup.today.slots;
          source = 'planned';
          dayStatus = plannedGroup.today.status;
      } else if (day === 1) {
          // Day 1 (Tue) gets "Tomorrow" data (Planned)
          slots = plannedGroup.tomorrow.slots;
          source = 'planned';
          dayStatus = plannedGroup.tomorrow.status;
      } else {
          // Days 2-6 get Probable data
          // probableGroupSlots keys are "0".."6".
          // We need to map subsequent days. 
          // If Day 0 was "Today" (Wed in real life, Mon in mock),
          // Then Day 2 (Wed in mock) should logically follow.
          // But probable data is just a week schedule 0-6.
          // Let's just use the corresponding index from probable slots 
          // matching the day index (0-6).
          slots = probableGroupSlots && probableGroupSlots[day.toString()];
          source = 'probable';
      }

      if (dayStatus === 'ScheduleApplies' || dayStatus === 'WaitingForSchedule') {
          // Add full day event for the status
          const start = new Date(dayDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(dayDate);
          end.setHours(23, 59, 59, 999);

          events.push({
              start: { dateTime: start.toISOString() },
              end: { dateTime: end.toISOString() },
              summary: dayStatus === 'ScheduleApplies' ? 'Schedule Applies' : 'Waiting for Schedule',
              entity_id: 'calendar.planned_outages'
          });
      }

      if (slots) {
          slots.forEach(slot => {
              const start = new Date(dayDate);
              start.setHours(0, slot.start, 0, 0);
              
              const end = new Date(dayDate);
              end.setHours(0, slot.end, 0, 0);

              if (source === 'planned') {
                   if (slot.type === 'Definite') {
                      events.push({
                          start: { dateTime: start.toISOString() },
                          end: { dateTime: end.toISOString() },
                          summary: 'Outage',
                          entity_id: 'calendar.planned_outages'
                      });
                   }
              } else {
                  if (slot.type === 'Definite') {
                      events.push({
                          start: { dateTime: start.toISOString() },
                          end: { dateTime: end.toISOString() },
                          summary: 'Probable Outage',
                          entity_id: 'calendar.probable_outages'
                      });
                  }
              }
          });
      }
  }

  return events;
};

const MOCK_EVENTS = getMockEvents();

async function renderScreenshot(browser, configItem) {
  const page = await browser.newPage();
  
  // Set viewport size
  await page.setViewport({ width: 1200, height: 600, deviceScaleFactor: 2 });

  // Log console messages from the page
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Set content first
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { 
            font-family: 'Roboto', sans-serif; 
            background-color: rgb(40, 40, 40);
            display: flex; 
            justify-content: center; 
            align-items: center; 
            min-height: 100vh; 
            margin: 0;
            padding: 40px 350px; /* Add padding */
            box-sizing: border-box;
          }
          /* Mock Variables */
          body {
            --primary-text-color: #e1e1e1;
            --secondary-text-color: #9b9b9b;
            --primary-color: #03a9f4;
            --card-background-color: #1d2021;
            --ha-card-background: var(--card-background-color);
            --ha-card-box-shadow: 0px 2px 1px -1px rgba(0,0,0,0.2), 0px 1px 1px 0px rgba(0,0,0,0.14), 0px 1px 3px 0px rgba(0,0,0,0.12);
            --ha-card-border-radius: 4px;
            color: var(--primary-text-color);
          }
        </style>
      </head>
      <body>
        <div id="card-container" style="width: 100%; max-width: 800px;"></div>
      </body>
    </html>
  `);

  // Inject mock HaCard and HaIcon
  await page.evaluate(() => {
    if (!customElements.get('ha-card')) {
      customElements.define('ha-card', class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        connectedCallback() {
          this.shadowRoot.innerHTML = `
            <style>
              :host {
                display: block;
                background: var(--ha-card-background, var(--card-background-color, #fff));
                box-shadow: var(--ha-card-box-shadow, none);
                border-radius: var(--ha-card-border-radius, 4px);
                color: var(--primary-text-color);
                transition: all 0.3s ease-out;
                position: relative;
              }
            </style>
            <slot></slot>
          `;
        }
      });
    }

    if (!customElements.get('ha-icon')) {
      customElements.define('ha-icon', class extends HTMLElement {
        constructor() {
          super();
          this.attachShadow({ mode: 'open' });
        }
        static get observedAttributes() { return ['icon']; }
        connectedCallback() {
            this.render();
        }
        attributeChangedCallback() {
            this.render();
        }
        render() {
          const icon = this.getAttribute('icon');
          const iconName = icon ? icon.replace('mdi:', 'mdi/') : '';
          
          if (!iconName) return;

          fetch(`https://api.iconify.design/${iconName}.svg`)
            .then(response => response.text())
            .then(svg => {
              this.shadowRoot.innerHTML = `
                <style>
                  :host {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    vertical-align: middle;
                    fill: currentcolor;
                    width: var(--mdc-icon-size, 24px);
                    height: var(--mdc-icon-size, 24px);
                  }
                  svg {
                    width: 100%;
                    height: 100%;
                    fill: currentColor;
                  }
                </style>
                ${svg}
              `;
            })
            .catch(err => {
                console.error('Failed to fetch icon:', icon, err);
            });
        }
      });
    }
  });

  // Override Date in the page context
  await page.evaluate((mockDateStr) => {
    const OriginalDate = Date;
    const mockTime = new OriginalDate(mockDateStr).getTime();
    
    // We need to keep the prototype chain but fix the constructor and now()
    class MockDate extends OriginalDate {
        constructor(...args) {
            if (args.length === 0) {
                super(mockTime);
            } else {
                super(...args);
            }
        }
        static now() {
            return mockTime;
        }
    }
    window.Date = MockDate;
  }, MOCK_DATE_STR);


  // Inject the card script
  const cardCode = fs.readFileSync(DIST_PATH, 'utf8');
  await page.evaluate((code) => {
    const script = document.createElement('script');
    script.textContent = code;
    script.type = 'module';
    document.body.appendChild(script);
  }, cardCode);

  // Wait for the custom element to be defined
  await page.waitForFunction(() => customElements.get('calendar-week-grid-card'));

  // Create and configure the card
  await page.evaluate(async (config, events) => {
    const card = document.createElement('calendar-week-grid-card');
    
    // Mock Hass object
    card.hass = {
      language: config.language || 'en',
      config: {
        time_zone: 'Europe/Kiev',
      },
        callApi: async (method, path) => {
          if (path.startsWith('calendars/')) {
              const parts = path.split('/');
              if (parts.length >= 2) {
                  // Extract entity_id before any query params
                  let calendarId = decodeURIComponent(parts[1]);
                  if (calendarId.includes('?')) {
                      calendarId = calendarId.split('?')[0];
                  }
                  
                  // Return filtered events for the given entity_id
                  const filtered = events.filter(e => e.entity_id === calendarId);
                  return filtered;
              }
          }
          return [];
        }
    };

    card.setConfig(config);
    document.getElementById('card-container').appendChild(card);
    
    // Force update if needed? Lit should handle it.
  }, configItem.config, MOCK_EVENTS);

  // Wait for card to render and fetch events
  await page.waitForFunction(() => {
    const card = document.querySelector('calendar-week-grid-card');
    return card && card.shadowRoot && card.shadowRoot.querySelector('.grid-container');
  });

  // Give it a bit more time for async fetch and render cycles
  await new Promise(r => setTimeout(r, 3000));

  // Take screenshot of the body to get the background
  const element = await page.$('body');
  if (element) {
    const imagePath = path.join(OUTPUT_DIR, `${configItem.name}.png`);
    await element.screenshot({ path: imagePath }); // omitBackground: false is default
    console.log(`Generated ${configItem.name}.png`);
  }

  await page.close();
}

(async () => {
  console.log('Starting screenshot generation...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    for (const config of CONFIGS) {
      await renderScreenshot(browser, config);
    }
  } catch (error) {
    console.error('Error generating screenshots:', error);
  } finally {
    await browser.close();
    console.log('Done.');
  }
})();
