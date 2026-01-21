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

| Name                    | Type          | Required | Description                                                                                                                                                  |
| ----------------------- | ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `type`                  | string        | **Yes**  | `custom:calendar-week-grid-card`                                                                                                                             |
| `entities`              | list          | **Yes**  | List of calendar entities or objects.                                                                                                                        |
| `language`              | string        | No       | Language code for days (e.g., `en`, `fr`).                                                                                                                   |
| `primary_date_format`   | object        | No       | Primary date format options for day headers. Default: `{ weekday: 'short' }`. See [Date Format](#date-format).                                               |
| `secondary_date_format` | object        | No       | Secondary date format options for day headers (displayed below primary). Optional. See [Date Format](#date-format).                                          |
| `time_format`           | string/object | No       | Time format pattern (string) or options (object). Default: `h A` (string) or `{ hour: 'numeric' }` (object). See [Time Format](#time-format).                |
| `time_range`            | boolean       | No       | Display time as a range (e.g., "09 - 10" instead of "09"). Default: `false`.                                                                                 |
| `start_hour`            | number        | No       | First hour to display (0-23). Default: 0.                                                                                                                    |
| `end_hour`              | number        | No       | Last hour to display (0-23). Default: 24.                                                                                                                    |
| `filter`                | string        | No       | Global filter text for event summary.                                                                                                                        |
| `icons_container`       | string        | No       | Where to render icons: `cell` (in the cell) or `event` (in event blocks). Default: `cell`.                                                                   |
| `icons_mode`            | string        | No       | Which events show icons: `top` (only main event) or `all` (all events). Default: `top`.                                                                      |
| `event_icon`            | string        | No       | Default icon for events when entity doesn't have its own icon. Default: `mdi:check-circle`.                                                                  |
| `blank_icon`            | string        | No       | Icon for cells with no events.                                                                                                                               |
| `all_day`               | string        | No       | Where to display all-day events: `grid` (in the grid), `row` (in a separate row), or `both` (in both the grid and a separate row). Default: `grid`.          |
| `all_day_icon`          | string        | No       | Icon for all-day events. If not specified, uses `blank_icon` for all-day cells.                                                                              |
| `all_day_label`         | string        | No       | Label text for the all-day row in the time column. Default: empty string.                                                                                    |
| `week_start`            | string        | No       | Day of the week to start the calendar: `today`, `sunday`, `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, or `saturday`. Default: `today`.           |
| `days`                  | number        | No       | Number of days to display. Default: `7`.                                                                                                                     |
| `theme`                 | string        | No       | Theme mode: `dark`, `light`, or `auto` (default). `auto` automatically detects the theme from Home Assistant. `dark` and `light` force the respective theme. |
| `css`                   | string        | No       | CSS styles for the card.                                                                                                                                     |

### Date Format

The `primary_date_format` and `secondary_date_format` options use `Intl.DateTimeFormatOptions` to format day headers. The primary format is displayed as the main label, and the secondary format (if provided) is displayed below it in smaller text.

#### Primary Date Format

Default: `{ weekday: 'short' }` (e.g., "Mon", "Tue", "Wed")

#### Secondary Date Format

Optional. Displayed below the primary format.

#### Available Options

- `weekday`: `'narrow'` | `'short'` | `'long'` - Day of week (e.g., "M", "Mon", "Monday")
- `day`: `'numeric'` | `'2-digit'` - Day of month (e.g., "15", "05")
- `month`: `'numeric'` | `'2-digit'` | `'narrow'` | `'short'` | `'long'` - Month (e.g., "3", "03", "M", "Mar", "March")
- `year`: `'numeric'` | `'2-digit'` - Year (e.g., "2024", "24")

#### Examples

```yaml
# Primary: weekday, Secondary: day and month
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
# Results: "Mon" (primary), "15 Jan" (secondary)

# Primary: long weekday, Secondary: full date
primary_date_format:
  weekday: 'long'
secondary_date_format:
  day: 'numeric'
  month: 'long'
  year: 'numeric'
# Results: "Monday" (primary), "15 January 2024" (secondary)
```

### Time Format

The `time_format` option supports two formats:

#### String Format (Legacy - Backward Compatible)

Custom pattern with tokens. Default: `h A`.

Available tokens:

- `H`: Hour (0-23)
- `HH`: Hour (00-23)
- `h`: Hour (1-12)
- `hh`: Hour (01-12)
- `m`: Minute (0-59)
- `mm`: Minute (00-59)
- `a`: am/pm
- `A`: AM/PM

Examples:

- `time_format: "h A"` → `9 AM`
- `time_format: "HH:mm"` → `09:00`
- `time_format: "hh:mm A"` → `09:00 AM`

#### Object Format (Recommended)

Uses `Intl.DateTimeFormatOptions` for locale-aware formatting. Default: `{ hour: 'numeric' }`

Available options:

- `hour`: `'numeric'` | `'2-digit'` - Hour format
- `minute`: `'numeric'` | `'2-digit'` - Minute format
- `second`: `'numeric'` | `'2-digit'` - Second format
- `hour12`: `true` | `false` - 12-hour vs 24-hour format

Examples:

```yaml
# 12-hour format with AM/PM
time_format:
  hour: 'numeric'
  hour12: true
# Results: "9 AM", "3 PM" (locale-aware)

# 24-hour format with minutes
time_format:
  hour: '2-digit'
  minute: '2-digit'
# Results: "09:00", "15:00"

# 12-hour format with minutes
time_format:
  hour: 'numeric'
  minute: '2-digit'
  hour12: true
# Results: "9:00 AM", "3:00 PM"
```

#### Time Range

When `time_range: true` is set, time labels are displayed as ranges showing the current hour and the next hour (e.g., "09 - 10" for the 9:00-10:00 time slot).

**Note:** When using object format with `time_range`, if `hour12` is not explicitly set, it will default to 24-hour format (`hour12: false`) for consistency.

Examples:

```yaml
# 24-hour range format (default for ranges)
time_format:
  hour: '2-digit'
time_range: true
# Results: "00 - 01", "09 - 10", "15 - 16"

# Explicit 24-hour range format
time_format:
  hour: '2-digit'
  hour12: false
time_range: true
# Results: "00 - 01", "09 - 10", "15 - 16"

# 12-hour range format (must explicitly set hour12: true)
time_format:
  hour: 'numeric'
  hour12: true
time_range: true
# Results: "12 AM - 1 AM", "9 AM - 10 AM", "3 PM - 4 PM"

# String format with range
time_format: 'HH'
time_range: true
# Results: "00 - 01", "09 - 10", "15 - 16"
```

### Entity Configuration

| Name     | Type   | Required | Description                                                                   |
| -------- | ------ | -------- | ----------------------------------------------------------------------------- |
| `name`   | string | No       | Friendly name for the entity.                                                 |
| `entity` | string | **Yes**  | The entity_id of the calendar.                                                |
| `filter` | string | No       | Filter text for events.                                                       |
| `icon`   | string | No       | Icon for the entity.                                                          |
| `type`   | string | No       | Type identifier for the entity.                                               |
| `under`  | array  | No       | Events to render underneath this one. See [Event Layering](#event-layering).  |
| `over`   | array  | No       | Events to render on top of this one. See [Event Layering](#event-layering).   |
| `hide`   | array  | No       | Events to hide when this event is present. See [Event Hiding](#event-hiding). |

### Data Attributes

Event elements (`.event-wrapper` and `.event-icon`) include the following data attributes that can be used for CSS styling:

| Attribute     | Description                                        |
| ------------- | -------------------------------------------------- |
| `data-name`   | The friendly name from the entity configuration.   |
| `data-entity` | The entity_id of the calendar.                     |
| `data-filter` | The filter text for events.                        |
| `data-type`   | The type identifier from the entity configuration. |

### Event Layering

The `under` and `over` options allow you to control the rendering order (z-index) of overlapping events. Events are matched using OR logic - if an event matches any of the criteria in the list, it will be repositioned.

#### Layer Criteria

Each item in `under` or `over` can be:

- A **string**: Treated as a `name` match
- An **object** with one or more of:
  - `name`: Match by entity name
  - `type`: Match by entity type
  - `entity`: Match by entity ID
  - `filter`: Match by filter text

#### Under

Events matching `under` criteria that appear **after** the current event will be moved **before** it, rendering them underneath (behind) the current event.

#### Over

Events matching `over` criteria that appear **before** the current event will be moved **after** it, rendering them on top (in front) of the current event.

### Event Hiding

The `hide` option allows you to hide specific events when the current event is present in the same cell. Events are matched using OR logic - if an event matches any of the criteria in the list, it will be removed from the display.

#### Hide Criteria

Each item in `hide` can be:

- A **string**: Treated as a `name` match
- An **object** with one or more of:
  - `name`: Match by entity name
  - `type`: Match by entity type
  - `entity`: Match by entity ID
  - `filter`: Match by filter text

## Examples

> [!NOTE]
> The examples use the [HA Yasno Outages](https://github.com/denysdovhan/ha-yasno-outages) integration calendar, which shows outages in Ukraine caused by Russian attacks on civilian and energy infrastructure during the invasion of Ukraine.

### Example 1: Basic

![Calendar Week Grid Card Example 1: Basic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_1_basic.png)

<!-- CONFIG:yasno_v3/basic -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: top
icons_container: cell
event:
blank_event:
blank_all_day_event:
entities:
  - entity: calendar.planned_outages
    filter: Outage
    icon: mdi:check-circle-outline
  - calendar.probable_outages
```

</details>

<!-- END_CONFIG -->

### Example 2: Simple

![Calendar Week Grid Card Example 2: Simple](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_2_simple.png)

<!-- CONFIG:yasno_v3/simple -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: top
icons_container: cell
all_day: row
theme_variables:
  icon-opacity:
    name: Icon Opacity
    description: The opacity of the event icon (0.0 to 1.0).
  opacity:
    name: Opacity
    description: The opacity of the event background (0.1 to 1.0).
  border-opacity:
    name: Border Opacity
    description: The opacity of the event border (0.0 to 1.0).
  border-style:
    name: Border Style
    description: The border style of the event (solid, dashed, dotted, double).
theme_values_examples:
  - opacity: 0.3
    border-style: solid
  - opacity: 0.1
    border-style: dashed
  - opacity: 0.2
    border-style: double
  - opacity: 0.1
    border-style: dotted
  - opacity: 0.1
    border-style: dotted
event:
blank_event:
  icon: mdi:checkbox-blank-circle-outline
  theme_values:
    icon-opacity: 0.3
    opacity: 0
    border-opacity: 0.3
blank_all_day_event:
  icon: mdi:checkbox-blank-circle
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      opacity: 0.3
      border-style: solid
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
    theme_values:
      opacity: 0.1
      border-style: dashed
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      opacity: 0.2
      border-style: double
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      opacity: 0.1
      border-style: dotted
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      opacity: 0.1
      border-style: dotted
    hide:
      - planned_outages
css: |
  .event-block {
    border-radius: 4px;
    border: 1px var(--border-style, dotted) rgb(from var(--primary-text-color) r g b / var(--border-opacity, 1.0));
  }

  .event-icon {
    opacity: var(--icon-opacity, 1.0);
  }

  .event-sub-block {
    background-color: rgb(from var(--primary-text-color) r g b / var(--opacity, 0.1));
  }
```

</details>

<!-- END_CONFIG -->

### Example 3: Simple Colored

![Calendar Week Grid Card Example 3: Simple Colored](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_3_simple_colored.png)

<!-- CONFIG:yasno_v3/simple_colored -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: top
icons_container: cell
all_day: row
theme_variables:
  icon-opacity:
    name: Icon Opacity
    description: The opacity of the event icon (0.0 to 1.0).
  color:
    name: Event Color
    description: The color of the event.
  opacity:
    name: Opacity
    description: The opacity of the event background (0.1 to 1.0).
  border-style:
    name: Border Style
    description: The border style of the event (solid, dashed, dotted, double).
  border-opacity:
    name: Border Opacity
    description: The opacity of the event border (0.0 to 1.0).
theme_values_examples:
  - color: var(--error-color)
    opacity: 0.1
    border-style: solid
  - color: var(--warning-color)
    opacity: 0.1
    border-style: dashed
  - color: var(--error-color)
    opacity: 0.2
    border-style: double
  - color: var(--success-color)
    opacity: 0.1
    border-style: dotted
  - color: var(--info-color)
    opacity: 0.1
    border-style: dotted
event:
blank_event:
  icon: mdi:checkbox-blank-circle-outline
  theme_values:
    icon-opacity: 0.3
    opacity: 0
    border-opacity: 0.3
blank_all_day_event:
  icon: mdi:checkbox-blank-circle
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: var(--error-color)
      opacity: 0.1
      border-style: solid
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
    theme_values:
      color: var(--warning-color)
      opacity: 0.1
      border-style: dashed
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: var(--error-color)
      opacity: 0.2
      border-style: double
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: var(--success-color)
      opacity: 0.1
      border-style: dotted
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: var(--info-color)
      opacity: 0.1
      border-style: dotted
    hide:
      - planned_outages
css: |
  .event-block {
    border-radius: 4px;
    border: 1px var(--border-style, dotted) rgb(from var(--color, var(--primary-text-color)) r g b / var(--border-opacity, 1.0));
  }

  .event-icon {
    color: var(--color, var(--primary-text-color));
    opacity: var(--icon-opacity, 1.0);
  }

  .event-sub-block {
    background-color: rgb(from var(--color, var(--primary-text-color)) r g b / var(--opacity, 0.1));
  }
```

</details>

<!-- END_CONFIG -->

### Example 4: Classic

![Calendar Week Grid Card Example 4: Classic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_4_classic.png)

<!-- CONFIG:yasno_v3/classic -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: top
icons_container: cell
all_day: row
theme_variables:
  icon-opacity:
    name: Icon Opacity
    description: The opacity of the event icon (0.0 to 1.0).
  color:
    name: Event Color
    description: The color of the event.
  opacity:
    name: Opacity
    description: The opacity of the event background (0.1 to 1.0).
theme_values_examples:
  - color: var(--error-color)
    opacity: 0.2
  - color: var(--primary-color)
    opacity: 0.2
  - color: var(--error-color)
    opacity: 0.4
  - color: var(--success-color)
    opacity: 0.2
  - color: var(--warning-color)
    opacity: 0.2
  - color: var(--info-color)
    opacity: 0.2
event:
blank_event:
  icon: mdi:checkbox-blank-circle-outline
  theme_values:
    icon-opacity: 0.3
    opacity: 0
blank_all_day_event:
  icon: mdi:checkbox-blank-circle
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: var(--error-color)
      opacity: 0.2
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: var(--primary-color)
      opacity: 0.2
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: var(--error-color)
      opacity: 0.4
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: var(--success-color)
      opacity: 0.2
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: var(--warning-color)
      opacity: 0.2
    hide:
      - planned_outages
css: |
  .event-block {
    border-radius: 4px;
  }

  .event-icon {
    color: var(--color, var(--primary-text-color));
    opacity: var(--icon-opacity, 1.0);
  }

  .event-sub-block {
    background-color: rgb(from var(--color, var(--primary-text-color)) r g b / var(--opacity, 0.2));
  }
```

</details>

<!-- END_CONFIG -->

### Example 5: Neon

![Calendar Week Grid Card Example 5: Neon](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_5_neon.png)

<!-- CONFIG:yasno_v3/neon -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: top
icons_container: cell
all_day: row
theme_variables:
  icon-opacity:
    name: Icon Opacity
    description: The opacity of the event icon (0.0 to 1.0).
  color:
    name: Event Color
    description: The color of the event.
  opacity:
    name: Opacity
    description: The opacity of the event background (0.1 to 1.0).
  background:
    name: Background
    description: The background of the event (color or repeating-linear-gradient).
theme_values_examples:
  - color: '#FF5252'
    background: 'repeating-linear-gradient(45deg, rgb(from #FF5252 r g b / 0.08), rgb(from #FF5252 r g b / 0.08) 10px, rgb(from #FF5252 r g b / 0.15) 10px, rgb(from #FF5252 r g b / 0.15) 20px)'
  - color: '#FF9800'
    background: 'repeating-linear-gradient(45deg, rgb(from #FF9800 r g b / 0.08), rgb(from #FF9800 r g b / 0.08) 10px, rgb(from #FF9800 r g b / 0.15) 10px, rgb(from #FF9800 r g b / 0.15) 20px)'
  - color: '#FF8A80'
    background: 'repeating-linear-gradient(45deg, rgb(from #FF8A80 r g b / 0.08), rgb(from #FF8A80 r g b / 0.08) 10px, rgb(from #FF8A80 r g b / 0.15) 10px, rgb(from #FF8A80 r g b / 0.15) 20px)'
  - color: '#29B6F6'
    background: 'repeating-linear-gradient(45deg, rgb(from #29B6F6 r g b / 0.08), rgb(from #29B6F6 r g b / 0.08) 10px, rgb(from #29B6F6 r g b / 0.15) 10px, rgb(from #29B6F6 r g b / 0.15) 20px)'
event:
blank_event:
  icon: mdi:lightning-bolt
  theme_values:
    icon-opacity: 0.7
    color: var(--neon-green)
    opacity: 0.01
blank_all_day_event:
  icon: mdi:circle-outline
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: '#FF5252'
      opacity: 0.08
      background: 'repeating-linear-gradient(45deg, rgb(from #FF5252 r g b / 0.08), rgb(from #FF5252 r g b / 0.08) 10px, rgb(from #FF5252 r g b / 0.15) 10px, rgb(from #FF5252 r g b / 0.15) 20px)'
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:alert-circle-outline
    theme_values:
      color: '#FF9800'
      opacity: 0.08
      background: 'repeating-linear-gradient(45deg, rgb(from #FF9800 r g b / 0.08), rgb(from #FF9800 r g b / 0.08) 10px, rgb(from #FF9800 r g b / 0.15) 10px, rgb(from #FF9800 r g b / 0.15) 20px)'
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: '#FF8A80'
      opacity: 0.2
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:calendar-check
    theme_values:
      color: '#29B6F6'
      opacity: 0.05
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: '#90A4AE'
      opacity: 0.05
    hide:
      - planned_outages
css: |
  ha-card {
    --neon-green: #00E676;
    --neon-green-shadow: rgba(0, 230, 118, 0.3);
    --icon-size: 18px;
  }

  .cell {
    height: 28px;
    border-radius: 6px;
  }

  .event-icon {
    color: var(--color, var(--primary-text-color));
    opacity: var(--icon-opacity, 1.0);
    filter: drop-shadow(0 0 2px rgb(from var(--color, var(--primary-text-color)) r g b / 0.3));
  }

  .event-wrapper .event-sub-block {
    background: var(--background, rgb(from var(--color, var(--primary-text-color)) r g b / var(--opacity, 0.1)));
  }
```

</details>

<!-- END_CONFIG -->

### Example 6: Soft UI

![Calendar Week Grid Card Example 6: Soft UI](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_6_soft_ui.png)

<!-- CONFIG:yasno_v3/soft_ui -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_container: event
icons_mode: all
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event icon.
  background:
    name: Background
    description: The background color of the event.
theme_values_examples:
  - color: '#FFFFFF'
    background: '#FF8A80'
  - color: '#1B5E20'
    background: '#B9F6CA'
  - color: '#FFFFFF'
    background: '#FF80AB'
  - color: '#F57F17'
    background: '#FFF176'
  - color: '#006064'
    background: '#80DEEA'
event:
blank_event:
  icon: mdi:circle-outline
  theme_values:
    color: '#E0E0E0'
    background: '#F5F5F5'
blank_all_day_event:
  icon: mdi:checkbox-blank-circle
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:close-circle
    theme_values:
      color: '#FFFFFF'
      background: '#FF8A80'
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:close-circle
    theme_values:
      color: '#1B5E20'
      background: '#B9F6CA'
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:alert-circle
    theme_values:
      color: '#FFFFFF'
      background: '#FF80AB'
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:circle-outline
    theme_values:
      color: '#F57F17'
      background: '#FFF176'
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:clock-outline
    theme_values:
      color: '#006064'
      background: '#80DEEA'
    hide:
      - planned_outages
css: |
  ha-card {
    --text-color: #444;
    --text-primary: var(--text-color);
    --text-secondary: var(--text-color);
  }

  ha-card {
    background: #FFFFFF;
    border-radius: 24px;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }

  .grid-container {
    gap: 8px;
  }

  .cell-wrapper {
    min-height: 28px;
  }

  .cell {
    height:34px;
    border-radius: 17px;
  }

  .event-icon {
    --icon-size: 20px;
    color: var(--color, var(--primary-text-color));
  }

  .event-block {
    background-color: var(--background, #F5F5F5);
  }
```

</details>

<!-- END_CONFIG -->

### Example 7: Yasno Legacy

![Calendar Week Grid Card Example 7: Yasno Legacy](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_7_yasno_legacy.png)

<!-- CONFIG:yasno_v3/yasno_legacy -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
  month: 'short'
time_format:
  hour: '2-digit'
  hour12: false
time_range: true
icons_container: event
icons_mode: all
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event icon.
  background:
    name: Background
    description: The background color of the event.
  opacity:
    name: Opacity
    description: The opacity of the event icon (0.0 to 1.0).
theme_values_examples:
  - color: var(--color-highlight-icon)
    background: var(--color-highlight)
  - color: var(--color-highlight-light-icon)
event:
blank_event:
  icon:
  theme_values:
    opacity: 0.3
blank_all_day_event:
  icon:
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    type: highlight
    icon: mdi:flash-off
    theme_values:
      color: var(--color-highlight-icon)
      background: var(--color-highlight)
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: var(--color-highlight-light-icon)
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: var(--color-highlight-light-icon)
      opacity: 0.5
    hide:
      - planned_outages
css: |
  ha-card {
    --color-highlight: #FDD631;
    --color-highlight-icon: #1e1e2e;
    --color-highlight-light: #FDD631;
    --color-highlight-light-icon: var(--primary-text-color);
    padding: 0;
  }

  ha-card.theme-dark {
    --color-highlight-light-icon: #FDD631;
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

  .time-label {
    padding: 0 18px;
  }

  .time-label.now {
    color: var(--primary-text-color);
  }

  .today, .now {
    &.day-header, &.time-label, .event-sub-block {
      background-color: rgb(from var(--color-highlight-light) r g b / 0.4);
    }
  }

  .event-block, .day-header {
    border-radius: 0px;
  }

  .event-icon {
    color: var(--color, var(--primary-text-color));
    opacity: var(--opacity, 1.0);
  }

  .event-block {
    background-color: var(--background, var(--card-background-color));
  }

  .grid-container > .row-odd {
    .event-wrapper:not([data-type="highlight"]) .event-block, .time-label {
      filter: contrast(1.05) brightness(0.95); 
    }
  }
```

</details>

<!-- END_CONFIG -->

### Example 8 (1): Google Calendar

![Calendar Week Grid Card Example 8 (1): Google Calendar](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_8_1_google_calendar.png)

<!-- CONFIG:yasno_v3/google_calendar -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: true
icons_mode: all
icons_container: event
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event.
theme_values_examples:
  - color: var(--error-color)
  - color: var(--primary-color)
  - color: var(--error-color)
  - color: var(--success-color)
  - color: var(--warning-color)
  - color: var(--info-color)
event:
blank_event:
  theme_values:
    color: transparent
blank_all_day_event:
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: var(--error-color)
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: var(--primary-color)
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: var(--error-color)
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: var(--success-color)
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: var(--warning-color)
    hide:
      - planned_outages
css: |
  ha-card { 
    --grid-bg: var(--card-background-color, #FFF);
    --grid-border-color: var(--divider-color, #dde3ea);
    --grid-primary-text-color: var(--primary-text-color, #1f1f1f);
    --grid-secondary-text-color: var(--secondary-text-color, #444746);
    --grid-event-text-color: var(--card-background-color, #fff);
    --grid-accent-color: var(--primary-color, #0b57d0);
    --grid-accent-text-color: var(--card-background-color, #fff);
  }

  ha-card.theme-dark {
    --grid-bg: var(--card-background-color, #202124);
    --grid-border-color: var(--divider-color, #3c4043);
    --grid-primary-text-color: var(--primary-text-color, #e3e3e3);
    --grid-secondary-text-color: var(--secondary-text-color, #c4c7c5);
    --grid-event-text-color: var(--card-background-color, #131314);
    --grid-accent-color: var(--primary-color, #a8c7fa);
    --grid-accent-text-color: var(--card-background-color, #062e6f);
  }

  ha-card {
    background-color: var(--grid-bg);
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  /* Grid Styling */

  .grid-container {
    gap: 0px;
  }

  .time-label-wrapper::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper,
  .time-label-wrapper::after {
    border-bottom: 1px solid var(--grid-border-color);
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper {
    border-left: 1px solid var(--grid-border-color);
    padding-right: 4px;
    padding-bottom: 4px;
  }

  .cell {
    position: relative;
    top: -1px;
    left: -1px;
    height: 24px;
  }

  .day-header {
    padding-bottom: 12px;
  }

  .day-header.today {
    color: var(--grid-accent-color);
  }

  .day-header-primary {
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 500;
    color: var(--grid-secondary-text-color);
  }

  .day-header-secondary {
    position: relative;
    font-size: 16px;
    font-weight: 400;
    color: var(--grid-primary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 4px;
    padding: 6px;
    aspect-ratio: 1/1;
    line-height: 1.2;
    min-width: fit-content;
  }

  .day-header.today .day-header-secondary {
    color: var(--grid-accent-text-color);
  }

  .day-header.today .day-header-secondary:before {
    content: '';
    position: absolute;
    z-index: -1; 
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background-color: var(--grid-accent-color);
  }

  .time-label-wrapper {
    position: relative;
  }

  .time-label {
    display: block;
    position: relative;
    font-size: 10px;
    line-height: 10px;
    color: var(--grid-secondary-text-color);
    padding-right: 0;
    margin-right: 20px;
    text-align: right;
  }

  .time-label-all-day {
    font-size: 8px;
  }

  .time-label-hour-separator {
    display: none;
  }

  .time-label-hour-start,
  .time-label-all-day,
  .time-label-hour-end {
    display: block;
  }

  .time-label-hour:not(.time-label-hour-end), 
  .time-label-all-day {
    position: relative;
    top: -5px;
    right: 0;
  }

  .time-label-hour-end {
    position: absolute;
    right: 0;
    bottom: -5px;
  }

  .time-label-wrapper:has(~ .time-label-wrapper) .time-label-hour-end {
    visibility: hidden;
  }

  .event-block {
    border-radius: 6px;
  }

  /* Icons: Subtle placement */

  .event-icon {
    color: var(--grid-event-text-color);
    --icon-size: 14px;
  }

  /* Current Time Line */

  .current-time-line {
    background-color: var(--warning-color);
    height: 2px;
  }
  .current-time-circle {
    background-color: var(--warning-color);
    width: 8px;
    height: 8px;
    left: -4px;
    top: -3px;
  }

  /* Default Event Styles */

  .event-sub-block {
    background-color: var(--color, var(--grid-primary-text-color));
  }
```

</details>

<!-- END_CONFIG -->

### Example 8 (2): Google Calendar Separated

![Calendar Week Grid Card Example 8 (2): Google Calendar Separated](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_8_2_google_calendar_separated.png)

<!-- CONFIG:yasno_v3/google_calendar_separated -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: true
icons_mode: all
icons_container: event
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event.
theme_values_examples:
  - color: var(--error-color)
  - color: var(--primary-color)
  - color: var(--error-color)
  - color: var(--success-color)
  - color: var(--warning-color)
  - color: var(--info-color)
event:
blank_event:
  theme_values:
    color: transparent
blank_all_day_event:
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: var(--error-color)
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: var(--primary-color)
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: var(--error-color)
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: var(--success-color)
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: var(--warning-color)
    hide:
      - planned_outages
css: |
  ha-card { 
    --grid-bg: var(--card-background-color, #FFF);
    --grid-border-color: var(--divider-color, #dde3ea);
    --grid-primary-text-color: var(--primary-text-color, #1f1f1f);
    --grid-secondary-text-color: var(--secondary-text-color, #444746);
    --grid-event-text-color: var(--card-background-color, #fff);
    --grid-accent-color: var(--primary-color, #0b57d0);
    --grid-accent-text-color: var(--card-background-color, #fff);
  }

  ha-card.theme-dark {
    --grid-bg: var(--card-background-color, #202124);
    --grid-border-color: var(--divider-color, #3c4043);
    --grid-primary-text-color: var(--primary-text-color, #e3e3e3);
    --grid-secondary-text-color: var(--secondary-text-color, #c4c7c5);
    --grid-event-text-color: var(--card-background-color, #131314);
    --grid-accent-color: var(--primary-color, #a8c7fa);
    --grid-accent-text-color: var(--card-background-color, #062e6f);
  }

  ha-card {
    background-color: var(--grid-bg);
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  /* Grid Styling */

  .grid-container {
    gap: 0px;
  }

  .time-label-wrapper::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper,
  .time-label-wrapper::after {
    border-bottom: 1px solid var(--grid-border-color);
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper {
    border-left: 1px solid var(--grid-border-color);
  }

  .cell {
    position: relative;
    top: -3px;
    left: -3px;
    height: 28px;
  }

  .day-header {
    padding-bottom: 12px;
  }

  .day-header.today {
    color: var(--grid-accent-color);
  }

  .day-header-primary {
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 500;
    color: var(--grid-secondary-text-color);
  }

  .day-header-secondary {
    position: relative;
    font-size: 16px;
    font-weight: 400;
    color: var(--grid-primary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 4px;
    padding: 6px;
    aspect-ratio: 1/1;
    line-height: 1.2;
    min-width: fit-content;
  }

  .day-header.today .day-header-secondary {
    color: var(--grid-accent-text-color);
  }

  .day-header.today .day-header-secondary:before {
    content: '';
    position: absolute;
    z-index: -1; 
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background-color: var(--grid-accent-color);
  }

  .time-label-wrapper {
    position: relative;
  }

  .time-label {
    display: block;
    position: relative;
    font-size: 10px;
    line-height: 10px;
    color: var(--grid-secondary-text-color);
    padding-right: 0;
    margin-right: 20px;
    text-align: right;
  }

  .time-label-all-day {
    font-size: 8px;
  }

  .time-label-hour-separator {
    display: none;
  }

  .time-label-hour-start,
  .time-label-all-day,
  .time-label-hour-end {
    display: block;
  }

  .time-label-hour:not(.time-label-hour-end), 
  .time-label-all-day {
    position: relative;
    top: -5px;
    right: 0;
  }

  .time-label-hour-end {
    position: absolute;
    right: 0;
    bottom: -5px;
  }

  .time-label-wrapper:has(~ .time-label-wrapper) .time-label-hour-end {
    visibility: hidden;
  }

  .event-sub-block {
    padding: 2px;
  }

  .event-sub-block:after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }

  /* Icons: Subtle placement */

  .event-icon {
    color: var(--grid-event-text-color);
    --icon-size: 14px;
  }

  .event-wrapper:has(.event-sub-block:not([style*="top: 0%;"][style*="height: 100%;"])) .event-icon-overlay {
    display: none;
  }

  /* Current Time Line */

  .current-time-line {
    background-color: var(--warning-color);
    height: 2px;
  }
  .current-time-circle {
    background-color: var(--warning-color);
    width: 8px;
    height: 8px;
    left: -4px;
    top: -3px;
  }

  /* Default Event Styles */

  .event-sub-block:after {
    background-color: var(--color, var(--grid-primary-text-color));
  }
```

</details>

<!-- END_CONFIG -->

### Example 8 (3): Google Calendar Original

![Calendar Week Grid Card Example 8 (3): Google Calendar Original](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_8_3_google_calendar_original.png)

<!-- CONFIG:yasno_v3/google_calendar_original -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: all
icons_container: event
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event.
theme_values_examples:
  - color: '#F3511E'
  - color: '#4285F4'
  - color: '#D40101'
  - color: '#34B779'
  - color: '#F6BE28'
event:
blank_event:
  theme_values:
    color: transparent
blank_all_day_event:
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: '#F3511E'
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: '#4285F4'
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: '#D40101'
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: '#34B779'
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: '#F6BE28'
    hide:
      - planned_outages
css: |
  ha-card { 
    --grid-bg: #FFF;
    --grid-border-color: #dde3ea;
    --grid-primary-text-color: #1f1f1f;
    --grid-secondary-text-color: #444746;
    --grid-event-text-color: #fff;
    --grid-accent-color: #0b57d0;
    --grid-accent-text-color: #fff;
  }

  ha-card.theme-dark {
    --grid-bg: #202124;
    --grid-border-color: #3c4043;
    --grid-primary-text-color: #e3e3e3;
    --grid-secondary-text-color: #c4c7c5;
    --grid-event-text-color: #131314;
    --grid-accent-color: #a8c7fa;
    --grid-accent-text-color: #062e6f;
  }

  ha-card {
    background-color: var(--grid-bg);
    box-shadow: none !important;
    border: none !important;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  /* Grid Styling */

  .grid-container {
    gap: 0px;
  }

  .time-label-wrapper::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper,
  .time-label-wrapper::after {
    border-bottom: 1px solid var(--grid-border-color);
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper {
    border-left: 1px solid var(--grid-border-color);
    padding-right: 4px;
    padding-bottom: 4px;
  }

  .cell {
    position: relative;
    top: -1px;
    left: -1px;
    height: 24px;
  }

  .day-header {
    padding-bottom: 12px;
  }

  .day-header.today {
    color: var(--grid-accent-color);
  }

  .day-header-primary {
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 500;
    color: var(--grid-secondary-text-color);
  }

  .day-header-secondary {
    position: relative;
    font-size: 16px;
    font-weight: 400;
    color: var(--grid-primary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 4px;
    padding: 6px;
    aspect-ratio: 1/1;
    line-height: 1.2;
    min-width: fit-content;
  }

  .day-header.today .day-header-secondary {
    color: var(--grid-accent-text-color);
  }

  .day-header.today .day-header-secondary:before {
    content: '';
    position: absolute;
    z-index: -1; 
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background-color: var(--grid-accent-color);
  }

  .time-label {
    top: -14px;
    font-size: 10px;
    line-height: 10px;
    color: var(--grid-secondary-text-color);
    padding-right: 20px;
  }

  .event-block {
    border-radius: 6px;
  }

  /* Icons: Subtle placement */

  .event-icon {
    color: var(--grid-event-text-color);
    --icon-size: 14px;
  }

  /* Current Time Line */

  .current-time-line {
    background-color: #ea4335;
    height: 2px;
  }
  .current-time-circle {
    background-color: #ea4335;
    width: 8px;
    height: 8px;
    left: -4px;
    top: -3px;
  }

  /* Default Event Styles */

  .event-sub-block {
    background-color: var(--color, var(--grid-primary-text-color));
  }
```

</details>

<!-- END_CONFIG -->

### Example 8 (4): Google Calendar Original Separated

![Calendar Week Grid Card Example 8 (4): Google Calendar Original Separated](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_8_4_google_calendar_original_separated.png)

<!-- CONFIG:yasno_v3/google_calendar_original_separated -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
primary_date_format:
  weekday: 'short'
secondary_date_format:
  day: 'numeric'
time_format:
  hour: '2-digit'
  minute: '2-digit'
  hour12: false
time_range: false
icons_mode: all
icons_container: event
all_day: row
theme_variables:
  color:
    name: Event Color
    description: The color of the event.
theme_values_examples:
  - color: '#F3511E'
  - color: '#4285F4'
  - color: '#D40101'
  - color: '#34B779'
  - color: '#F6BE28'
event:
blank_event:
  theme_values:
    color: transparent
blank_all_day_event:
entities:
  - name: planned_outages
    entity: calendar.planned_outages
    filter: Outage
    icon: mdi:flash-off
    theme_values:
      color: '#F3511E'
  - name: probable_outages
    entity: calendar.probable_outages
    icon: mdi:flash-off
    theme_values:
      color: '#4285F4'
  - name: emergency_shutdowns
    entity: calendar.planned_outages
    filter: Emergency Shutdowns
    icon: mdi:transmission-tower-off
    theme_values:
      color: '#D40101'
  - name: schedule_applies
    entity: calendar.planned_outages
    filter: Schedule Applies
    icon: mdi:flash-off
    theme_values:
      color: '#34B779'
  - name: waiting_for_schedule
    entity: calendar.planned_outages
    filter: Waiting for Schedule
    icon: mdi:timer-sand
    theme_values:
      color: '#F6BE28'
    hide:
      - planned_outages
css: |
  ha-card {
    --grid-bg: #FFF;
    --grid-border-color: #dde3ea;
    --grid-primary-text-color: #1f1f1f;
    --grid-secondary-text-color: #444746;
    --grid-event-text-color: #fff;
    --grid-accent-color: #0b57d0;
    --grid-accent-text-color: #fff;
  }

  ha-card.theme-dark {
    --grid-bg: #202124;
    --grid-border-color: #3c4043;
    --grid-primary-text-color: #e3e3e3;
    --grid-secondary-text-color: #c4c7c5;
    --grid-event-text-color: #131314;
    --grid-accent-color: #a8c7fa;
    --grid-accent-text-color: #062e6f;
  }

  ha-card {
    background-color: var(--grid-bg);
    box-shadow: none !important;
    border: none !important;
    border-radius: 16px;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
  }

  /* Grid Styling */

  .grid-container {
    gap: 0px;
  }

  .time-label-wrapper::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 10px;
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper,
  .time-label-wrapper::after {
    border-bottom: 1px solid var(--grid-border-color);
  }

  .time-label-wrapper + .cell-wrapper,
  .cell-wrapper + .cell-wrapper {
    border-left: 1px solid var(--grid-border-color);
  }

  .cell {
    position: relative;
    top: -3px;
    left: -3px;
    height: 28px;
  }

  .day-header {
    padding-bottom: 12px;
  }

  .day-header.today {
    color: var(--grid-accent-color);
  }

  .day-header-primary {
    text-transform: uppercase;
    font-size: 10px;
    font-weight: 500;
    color: var(--grid-secondary-text-color);
  }

  .day-header-secondary {
    position: relative;
    font-size: 16px;
    font-weight: 400;
    color: var(--grid-primary-text-color);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    margin-top: 4px;
    padding: 6px;
    aspect-ratio: 1/1;
    line-height: 1.2;
    min-width: fit-content;
  }

  .day-header.today .day-header-secondary {
    color: var(--grid-accent-text-color);
  }

  .day-header.today .day-header-secondary:before {
    content: '';
    position: absolute;
    z-index: -1; 
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border-radius: 50%;
    background-color: var(--grid-accent-color);
  }

  .time-label {
    top: -14px;
    font-size: 10px;
    line-height: 10px;
    color: var(--grid-secondary-text-color);
    padding-right: 20px;
  }

  .event-sub-block {
    padding: 2px;
  }

  .event-sub-block:after {
    content: '';
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 6px;
  }

  /* Icons: Subtle placement */

  .event-icon {
    color: var(--grid-event-text-color);
    --icon-size: 14px;
  }

  .event-wrapper:has(.event-sub-block:not([style*="top: 0%;"][style*="height: 100%;"])) .event-icon-overlay {
    display: none;
  }

  /* Current Time Line */

  .current-time-line {
    background-color: #ea4335;
    height: 2px;
  }
  .current-time-circle {
    background-color: #ea4335;
    width: 8px;
    height: 8px;
    left: -4px;
    top: -3px;
  }

  /* Default Event Styles */

  .event-sub-block:after {
    background-color: var(--color, var(--grid-primary-text-color));
  }
```

</details>

<!-- END_CONFIG -->
