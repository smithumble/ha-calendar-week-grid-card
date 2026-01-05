# HA Calendar Week Grid Card

A custom Home Assistant card that displays calendar events in a week grid format. Check out the **[Demo](https://smithumble.github.io/ha-calendar-week-grid-card/)**

![Calendar Week Grid Card Screenshot](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/image.png)

## Installation

### HACS Installation (Recommended)

The easiest way to install **Calendar Week Grid Card** is via **[HACS (Home Assistant Community Store)](https://hacs.xyz/)**.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=smithumble&repository=ha-calendar-week-grid-card&category=plugin)

If it doesn't work, add this repository to HACS manually:

1. Ensure **[HACS](https://hacs.xyz/docs/setup/download)** is installed in Home Assistant.
2. Go to **HACS → 3 dots (top right) → Custom Repositories**.
3. Add this repository: `https://github.com/smithumble/ha-calendar-week-grid-card` as type `Dashboard`
4. Install **Calendar Week Grid Card** from HACS.
5. **Clear your browser cache** and reload Home Assistant.

### Manual Installation

1. **Download** the latest release: [calendar-week-grid-card.js](https://github.com/smithumble/ha-calendar-week-grid-card/releases/latest)
2. Place it in your `www` folder (e.g. `/config/www/calendar-week-grid-card.js`).
3. Add a reference to `calendar-week-grid-card.js`.

There are two ways to add a reference:

#### Using UI

1. Go to **Settings → Dashboards → 3 dots (top right) → Resources**.

> [!NOTE]
> If you do not see the Resources Tab, you will need to enable **Advanced Mode** in your **User Profile**.

2. Click the **Add Resource** button.
3. Set **Url** to `/local/calendar-week-grid-card.js?v=1`.

> [!NOTE]
> After any update of the file you will have to edit `/local/calendar-week-grid-card.js?v=1` and change the version to any higher number.

4. Set **Resource type** to `JavaScript module`.

#### Using YAML

Add the resource to your yaml configuration:

```yaml
url: /local/calendar-week-grid-card.js
type: module
```

## Configuration

| Name              | Type   | Required | Description                                                                                 |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------------------------- |
| `type`            | string | **Yes**  | `custom:calendar-week-grid-card`                                                            |
| `entities`        | list   | **Yes**  | List of calendar entities or objects.                                                       |
| `language`        | string | No       | Language code for days (e.g., `en`, `fr`).                                                  |
| `time_format`     | string | No       | Time format pattern (e.g., `h A`, `HH:mm`).                                                 |
| `start_hour`      | number | No       | First hour to display (0-23). Default: 0.                                                   |
| `end_hour`        | number | No       | Last hour to display (0-23). Default: 24.                                                   |
| `filter`          | string | No       | Global filter text for event summary.                                                       |
| `icons_container` | string | No       | Where to render icons: `cell` (in the cell) or `event` (in event blocks). Default: `cell`.  |
| `icons_mode`      | string | No       | Which events show icons: `top` (only main event) or `all` (all events). Default: `top`.     |
| `event_icon`      | string | No       | Default icon for events when entity doesn't have its own icon. Default: `mdi:check-circle`. |
| `blank_icon`      | string | No       | Icon for cells with no events.                                                              |
| `css`             | string | No       | CSS styles for the card.                                                                    |

### Time Format

The `time_format` option supports custom patterns. Default is `h A`.

You can use custom tokens:

- `H`: Hour (0-23)
- `HH`: Hour (00-23)
- `h`: Hour (1-12)
- `hh`: Hour (01-12)
- `m`: Minute (0-59)
- `mm`: Minute (00-59)
- `a`: am/pm
- `A`: AM/PM

Example: `time_format: "h:mm A"` results in `1:00 PM`.

### Entity Configuration

| Name          | Type   | Required | Description                                                             |
| ------------- | ------ | -------- | ----------------------------------------------------------------------- |
| `name`        | string | No       | Friendly name for the entity.                                           |
| `entity`      | string | **Yes**  | The entity_id of the calendar.                                          |
| `filter`      | string | No       | Filter text for events.                                                 |
| `icon`        | string | No       | Icon for the entity.                                                    |
| `type`        | string | No       | Type identifier for the entity.                                         |
| `shift_left`  | array  | No       | Events to shift before this one. See [Event Shifting](#event-shifting). |
| `shift_right` | array  | No       | Events to shift after this one. See [Event Shifting](#event-shifting).  |

### Data Attributes

Event elements (`.event-wrapper` and `.event-icon`) include the following data attributes that can be used for CSS styling:

| Attribute     | Description                                        |
| ------------- | -------------------------------------------------- |
| `data-name`   | The friendly name from the entity configuration.   |
| `data-entity` | The entity_id of the calendar.                     |
| `data-filter` | The filter text for events.                        |
| `data-type`   | The type identifier from the entity configuration. |

### Event Shifting

The `shift_left` and `shift_right` options allow you to control the rendering order of events. Events are matched using OR logic - if an event matches any of the criteria in the list, it will be shifted.

#### Shift Criteria

Each item in `shift_left` or `shift_right` can be:

- A **string**: Treated as a `name` match (e.g., `"planned_outages"`)
- An **object** with one or more of:
  - `name`: Match by entity name
  - `type`: Match by entity type
  - `entity`: Match by entity ID
  - `filter`: Match by filter text

#### Shift Left

Events matching `shift_left` criteria that appear **after** the current event will be moved **before** it.

#### Shift Right

Events matching `shift_right` criteria that appear **before** the current event will be moved **after** it.

## Examples

> [!NOTE]
> The examples use the [HA Yasno Outages](https://github.com/denysdovhan/ha-yasno-outages) integration calendar, which shows outages in Ukraine caused by Russian attacks on civilian and energy infrastructure during the invasion of Ukraine.

### Example 1: Basic

![Calendar Week Grid Card Example 1: Basic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_1_basic.png)

<!-- CONFIG:yasno/example_1_basic -->

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
entities:
  - entity: calendar.planned_outages
    filter: Outage
    icon: mdi:check-circle-outline
  - calendar.probable_outages
```

<!-- END_CONFIG -->

### Example 2: Simple

![Calendar Week Grid Card Example 2: Simple](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_2_simple.png)

<!-- CONFIG:yasno/example_2_simple -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
blank_icon: mdi:checkbox-blank-circle-outline
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    shift_left:
      - planned_outages
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:calendar-check
css: |
  .event-block {
    border-radius: 4px;
    border: 1px dotted rgb(from var(--primary-text-color) r g b / 0.3);
  }

  .event-sub-block {
    margin: -1px;
  }

  [data-type="blank"] {
    &.event-icon {
      opacity: 0.3;
    }
  }

  [data-name="planned_outages"] {
    .event-block {
      border: 1px solid var(--primary-text-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--primary-text-color) r g b / 0.3);
    }
  }

  [data-name="emergency_shutdowns"] {
    .event-block {
      border: 1px double var(--primary-text-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--primary-text-color) r g b / 0.2);
    }
  }

  [data-name="waiting_for_schedule"]  {
    &.event-icon {
      opacity: 0.4;
    }

    .event-block {
      opacity: 0.4;
      border: 1px dotted var(--primary-text-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--primary-text-color) r g b / 0.1);
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      opacity: 0.4;
    }

    .event-block {
      opacity: 0.4;
      border: 1px dotted var(--primary-text-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--primary-text-color) r g b / 0.1);
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: var(--primary-text-color);
    }

    .event-block {
      border: 1px dashed var(--primary-text-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--primary-text-color) r g b / 0.1);
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 3: Simple Colored

![Calendar Week Grid Card Example 3: Simple Colored](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_3_simple_colored.png)

<!-- CONFIG:yasno/example_3_simple_colored -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
blank_icon: mdi:checkbox-blank-circle-outline
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    shift_left:
      - planned_outages
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:calendar-check
css: |
  .event-block {
    border-radius: 4px;
    border: 1px dotted rgb(from var(--secondary-text-color) r g b / 0.3);
  }

  .event-sub-block {
    margin: -1px;
  }

  [data-type="blank"] {
    &.event-icon {
      opacity: 0.3;
    }
  }

  [data-name="planned_outages"] {
    &.event-icon {
      color: var(--error-color);
    }

    .event-block {
      border: 1px solid var(--error-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--error-color) r g b / 0.1);
    }
  }

  [data-name="emergency_shutdowns"] {
    &.event-icon {
      color: var(--error-color);
    }

    .event-block {
      border: 1px double var(--error-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--error-color) r g b / 0.2);
    }
  }

  [data-name="waiting_for_schedule"] {
    &.event-icon {
      opacity: 0.4;
      color: var(--info-color);
    }

    .event-block {
      opacity: 0.4;
      border: 1px dotted var(--info-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--info-color) r g b / 0.1);
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      opacity: 0.4;
      color: var(--success-color);
    }

    .event-block {
      opacity: 0.4;
      border: 1px dotted var(--info-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--success-color) r g b / 0.1);
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: var(--warning-color);
    }

    .event-block {
      border: 1px dashed var(--warning-color);
    }

    .event-sub-block {
      background-color: rgb(from var(--warning-color) r g b / 0.1);
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 4: Classic

![Calendar Week Grid Card Example 4: Classic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_4_classic.png)

<!-- CONFIG:yasno/example_4_classic -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: HH:mm
blank_icon: mdi:checkbox-blank-circle-outline
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    shift_left:
      - planned_outages
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:checkbox-blank-circle-outline
css: |
  .event-block {
    border-radius: 4px;
  }

  [data-type="blank"] {
    &.event-icon {
      opacity: 0.3;
    }
  }

  [data-name="planned_outages"] {
    &.event-icon {
      color: #FF0000;
    }

    .event-sub-block {
      background-color: rgb(from #FF0000 r g b / 0.2);
    }
  }

  [data-name="emergency_shutdowns"] {
    &.event-icon {
      color: #FF0000;
    }

    .event-sub-block {
      background-color: rgb(from #FF0000 r g b / 0.2);
    }
  }

  [data-name="waiting_for_schedule"] {
    &.event-icon {
      opacity: 0.6;
      color: #FF9800;
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      color: #FF0000;
      opacity: 0.4;
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: #29B6F6;
    }

    .event-sub-block {
      background-color: rgb(from #29B6F6 r g b / 0.2);
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 5: Neon

![Calendar Week Grid Card Example 5: Neon](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_5_neon.png)

<!-- CONFIG:yasno/example_5_neon -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
blank_icon: mdi:lightning-bolt
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    shift_left:
      - planned_outages
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:calendar-check
css: |
  :host {
    --neon-green: #00E676;
    --neon-green-shadow: rgba(0, 230, 118, 0.3);
    --neon-green-bg: rgba(0, 230, 118, 0.01);
    --neon-grey: #B0BEC5;
    --neon-grey-bg: rgba(255, 255, 255, 0.03);
    --neon-orange: #FF9800;
    --neon-orange-grad-1: rgba(255, 152, 0, 0.08);
    --neon-orange-grad-2: rgba(255, 152, 0, 0.15);
    --neon-red: #FF5252;
    --neon-red-shadow: rgba(255, 82, 82, 0.3);
    --neon-red-grad-1: rgba(244, 67, 54, 0.08);
    --neon-red-grad-2: rgba(244, 67, 54, 0.15);
    --neon-dark-red-bg: rgba(183, 28, 28, 0.2);
    --neon-light-red: #FF8A80;
    --neon-blue-grey: #90A4AE;
    --neon-blue-grey-bg: rgba(120, 144, 156, 0.05);
    --neon-light-blue-bg: rgba(3, 169, 244, 0.05);
    --neon-light-blue: #29B6F6;
    --shadow-color: rgba(0,0,0,0.1);
    --icon-size: 18px;
  }

  ha-card {
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 4px 6px var(--shadow-color);
  }

  .cell {
    height: 28px;
    border-radius: 6px;
  }

  .event-block {
    background-color: var(--neon-green-bg);
    border-radius: 6px;
  }

  [data-type="blank"] {
    &.event-icon {
      color: var(--neon-green);
      opacity: 0.7;
      filter: drop-shadow(0 0 2px var(--neon-green-shadow));
    }
  }

  [data-name="planned_outages"] {
    &.event-icon {
      color: var(--neon-red);
      filter: drop-shadow(0 0 2px var(--neon-red-shadow));
    }

    .event-sub-block {
      background: repeating-linear-gradient(
        45deg, 
        var(--neon-red-grad-1),
        var(--neon-red-grad-1) 10px,
        var(--neon-red-grad-2) 10px,
        var(--neon-red-grad-2) 20px);
    }
  }

  [data-name="emergency_shutdowns"] {
    &.event-icon {
      color: var(--neon-light-red);
      opacity: 1;
    }

    .event-sub-block {
      background-color: var(--neon-dark-red-bg);
    }
  }

  [data-name="waiting_for_schedule"] {
    &.event-icon {
      color: var(--neon-blue-grey);
    }

    .event-sub-block {
      background-color: var(--neon-blue-grey-bg);
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      color: var(--neon-light-blue);
    }

    .event-sub-block {
      background-color: var(--neon-light-blue-bg);
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: var(--neon-orange);
      opacity: 0.9;
    }

    .event-sub-block {
      background: repeating-linear-gradient(
        45deg, 
        var(--neon-orange-grad-1),
        var(--neon-orange-grad-1) 10px, 
        var(--neon-orange-grad-2) 10px, 
        var(--neon-orange-grad-2) 20px);
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 6: Soft UI

![Calendar Week Grid Card Example 6: Soft UI](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_6_soft_ui.png)

<!-- CONFIG:yasno/example_6_soft_ui -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
icons_container: event
icons_mode: all
blank_icon: mdi:circle-outline
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:close-circle
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:close-circle
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:alert-circle
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:clock-outline
    shift_left:
      - planned_outages
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:circle-outline
css: |
  :host {
    --text-color: #444;
    --text-primary: var(--text-color);
    --text-secondary: var(--text-color);
  }

  ha-card {
    background: #FFFFFF;
    border-radius: 24px;
    padding: 16px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }

  .grid-container {
    gap: 8px;
  }

  .cell {
    height: 34px;
    border-radius: 17px;
  }

  .event-icon {
    --icon-size: 20px;
  }

  .event-block {
    background-color: #F5F5F5;
  }

  ha-icon[data-type="blank"] {
    color: #E0E0E0;
  }

  [data-name="planned_outages"] {
    &.event-icon {
      color: #FFFFFF;
    }

    .event-block {
      background-color: #FF8A80;
    }
  }

  [data-name="emergency_shutdowns"] {
    &.event-icon {
      color: #FFFFFF;
    }

    .event-block {
      background-color: #FF80AB;
    }
  }

  [data-name="waiting_for_schedule"] {
    &.event-icon {
      color: #006064;
    }

    .event-block {
      background-color: #80DEEA;
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      color: #F57F17;
    }

    .event-block {
      background-color: #FFF176;
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: #1B5E20;
    }

    .event-block {
      background-color: #B9F6CA;
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 7: Yasno Legacy

![Calendar Week Grid Card Example 7: Yasno Legacy](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_7_yasno_legacy.png)

<!-- CONFIG:yasno/example_7_yasno_legacy -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: HH:mm
icons_container: event
icons_mode: all
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    shift_left:
      - planned_outages
css: |
  :host {
    --color-highlight: #FDD631;
    --color-highlight-icon: #1e1e2e;

    --color-highlight-light: #FDD631;
    --color-highlight-light-icon: var(--primary-text-color);
  }

  :host-context(.theme-dark) {
    --color-highlight-light-icon: #FDD631;
  }

  ha-card {
    padding: 0;
  }

  .grid-container {
    gap: 0px;
  }

  .event-icon {
    --icon-size: 16px;
  }

  .event-block, .time-label {
    background-color: var(--card-background-color);
  }

  .today, .now {
    &.day-header, &.time-label, .event-sub-block {
      background-color: rgb(from var(--color-highlight-light) r g b / 0.4);
    }
  }

  .event-block, .day-header {
    border-radius: 0px;
  }

  [data-type="blank"] {
    &.event-icon {
      opacity: 0.3;
    }
  }

  [data-name="planned_outages"] {
    .event-block {
      background-color: var(--color-highlight);
    }

    &.event-icon {
      color: var(--color-highlight-icon);
    }
  }

  [data-name="waiting_for_schedule"] {
    &.event-icon {
      color: var(--color-highlight-light-icon);
      opacity: 0.5;
    }
  }

  [data-name="schedule_applies"] {
    &.event-icon {
      opacity: 0.4;
      color: var(--color-highlight-icon);
    }
  }

  [data-name="probable_outages"] {
    &.event-icon {
      color: var(--color-highlight-light-icon);
    }
  }

  .grid-container > :nth-child(16n+9),
  .grid-container > :nth-child(16n+10),
  .grid-container > :nth-child(16n+11),
  .grid-container > :nth-child(16n+12),
  .grid-container > :nth-child(16n+13),
  .grid-container > :nth-child(16n+14),
  .grid-container > :nth-child(16n+15),
  .grid-container > :nth-child(16n+16) {
    .event-wrapper:not([data-name="planned_outages"]) .event-block, &.time-label {
      filter: contrast(1.05) brightness(0.95); 
    }
  }
```

</details>

<!-- END_CONFIG -->
