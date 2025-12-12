# HA Calendar Week Grid Card

A custom Home Assistant card that displays calendar events in a week grid format.

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

| Name          | Type   | Required | Description                                                    |
| ------------- | ------ | -------- | -------------------------------------------------------------- |
| `type`        | string | **Yes**  | `custom:calendar-week-grid-card`                               |
| `entities`    | list   | **Yes**  | List of calendar entities or objects.                          |
| `language`    | string | No       | Language code for days (e.g., `en`, `fr`).                     |
| `time_format` | string | No       | Time format pattern (e.g., `h A`, `HH:mm`).                    |
| `start_hour`  | number | No       | First hour to display (0-23). Default: 0.                      |
| `end_hour`    | number | No       | Last hour to display (0-23). Default: 24.                      |
| `filter`      | string | No       | Global filter text for event summary.                          |
| `grid`        | object | No       | Configuration for the grid container (see Grid Configuration). |
| `cell`        | object | No       | Configuration for cells (see Cell Configuration).              |
| `cell_filled` | object | No       | Configuration for cells with events (see Cell Configuration).  |
| `cell_blank`  | object | No       | Configuration for empty cells (see Cell Configuration).        |
| `style`       | object | No       | CSS styles for the main card.                                  |
| `raw_style`   | string | No       | Raw CSS string for the main card.                              |

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

### Cell Configuration

Configuration object for `cell`, `cell_filled`, `cell_blank`, and `entity.cell`.

| Name         | Type   | Description                                               |
| ------------ | ------ | --------------------------------------------------------- |
| `icon`       | object | Configuration for the icon (see Icon Configuration).      |
| `background` | object | Configuration for the background (see Background Config). |
| `style`      | object | CSS styles for the cell container.                        |
| `raw_style`  | string | Raw CSS string for the cell container.                    |

#### Icon Configuration

| Name        | Type   | Description                   |
| ----------- | ------ | ----------------------------- |
| `icon`      | string | Icon name (e.g., `mdi:home`). |
| `style`     | object | CSS styles for the icon.      |
| `raw_style` | string | Raw CSS string for the icon.  |

#### Background Configuration

| Name        | Type   | Description                              |
| ----------- | ------ | ---------------------------------------- |
| `style`     | object | CSS styles for the background block.     |
| `raw_style` | string | Raw CSS string for the background block. |

### Grid Configuration

Configuration object for `grid`.

| Name        | Type   | Description                            |
| ----------- | ------ | -------------------------------------- |
| `style`     | object | CSS styles for the grid container.     |
| `raw_style` | string | Raw CSS string for the grid container. |

### Entity Configuration

| Name     | Type   | Required | Description                                          |
| -------- | ------ | -------- | ---------------------------------------------------- |
| `entity` | string | **Yes**  | The entity_id of the calendar.                       |
| `name`   | string | No       | Friendly name for the entity (currently unused).     |
| `filter` | string | No       | Filter text for events.                              |
| `cell`   | object | No       | Configuration for the cell (see Cell Configuration). |

## Examples

> [!NOTE]
> The examples use the [HA Yasno Outages](https://github.com/denysdovhan/ha-yasno-outages) integration calendar, which shows outages in Ukraine caused by Russian attacks on civilian and energy infrastructure during the invasion of Ukraine.

### Example 1: Basic

![Calendar Week Grid Card Example 1: Basic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_1_basic.png)

<!-- CONFIG:example_1_basic -->

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
entities:
  - calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Outage
```

<!-- END_CONFIG -->

### Example 2: Simple

![Calendar Week Grid Card Example 2: Simple](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_2_simple.png)

<!-- CONFIG:example_2_simple -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
style:
  '--event-border-radius': 4px
  '--main-color': var(--primary-text-color)
cell_blank:
  background:
    style:
      border: 1px dotted rgb(from var(--main-color) r g b / 0.3)
  icon:
    icon: mdi:checkbox-blank-circle-outline
    style:
      opacity: 0.3
entities:
  - entity: calendar.probable_outages
    cell:
      icon:
        icon: mdi:alert-circle-outline
        style:
          color: var(--main-color)
      background:
        style:
          border: 1px dashed var(--main-color)
          background-color: rgb(from var(--main-color) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      icon:
        icon: mdi:flash-off
        style:
          color: var(--main-color)
      background:
        style:
          border: 1px solid var(--main-color)
          background-color: rgb(from var(--main-color) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      icon:
        icon: mdi:transmission-tower-off
        style:
          color: var(--main-color)
      background:
        style:
          border: 1px double var(--main-color)
          background-color: rgb(from var(--main-color) r g b / 0.2)
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      icon:
        icon: mdi:timer-sand
        style:
          opacity: 0.4
          color: var(--main-color)
      background:
        style:
          opacity: 0.4
          border: 1px dotted var(--main-color)
          background-color: rgb(from var(--main-color) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      icon:
        icon: mdi:calendar-check
        style:
          opacity: 0.4
          color: var(--main-color)
      background:
        style:
          opacity: 0.4
          border: 1px dotted var(--main-color)
          background-color: rgb(from var(--main-color) r g b / 0.1)
```

</details>

<!-- END_CONFIG -->

### Example 3: Simple Colored

![Calendar Week Grid Card Example 3: Simple Colored](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_3_simple_colored.png)

<!-- CONFIG:example_3_simple_colored -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
style:
  '--event-border-radius': 4px
  '--color-neutral': var(--secondary-text-color)
  '--color-warning': var(--warning-color)
  '--color-error': var(--error-color)
  '--color-info': var(--info-color)
  '--color-success': var(--success-color)
cell_blank:
  background:
    style:
      border: 1px dotted rgb(from var(--color-neutral) r g b / 0.3)
  icon:
    icon: mdi:checkbox-blank-circle-outline
    style:
      opacity: 0.3
entities:
  - entity: calendar.probable_outages
    cell:
      icon:
        icon: mdi:alert-circle-outline
        style:
          color: var(--color-warning)
      background:
        style:
          border: 1px dashed var(--color-warning)
          background-color: rgb(from var(--color-warning) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      icon:
        icon: mdi:flash-off
        style:
          color: var(--color-error)
      background:
        style:
          border: 1px solid var(--color-error)
          background-color: rgb(from var(--color-error) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      icon:
        icon: mdi:transmission-tower-off
        style:
          color: var(--color-error)
      background:
        style:
          border: 1px double var(--color-error)
          background-color: rgb(from var(--color-error) r g b / 0.2)
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      icon:
        icon: mdi:timer-sand
        style:
          opacity: 0.4
          color: var(--color-info)
      background:
        style:
          opacity: 0.4
          border: 1px dotted var(--color-info)
          background-color: rgb(from var(--color-info) r g b / 0.1)
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      icon:
        icon: mdi:calendar-check
        style:
          opacity: 0.4
          color: var(--color-success)
      background:
        style:
          opacity: 0.4
          border: 1px dotted var(--color-success)
          background-color: rgb(from var(--color-success) r g b / 0.1)
```

</details>

<!-- END_CONFIG -->

### Example 4: Classic

![Calendar Week Grid Card Example 4: Classic](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_4_classic.png)

<!-- CONFIG:example_4_classic -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: HH:mm
style:
  '--event-border-radius': 4px
  '--color-neutral': var(--secondary-text-color)
  '--color-warning': '#FF9800'
  '--color-error': '#FF0000'
  '--color-info': '#29B6F6'
  '--color-success': var(--success-color)
cell_blank:
  icon:
    icon: mdi:checkbox-blank-circle-outline
    style:
      opacity: 0.3
entities:
  - entity: calendar.probable_outages
    cell:
      icon:
        icon: mdi:alert-circle-outline
        style:
          color: var(--color-info)
      background:
        style:
          background-color: rgb(from var(--color-info) r g b / 0.2)
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      icon:
        icon: mdi:flash-off
        style:
          color: var(--color-error)
      background:
        style:
          background-color: rgb(from var(--color-error) r g b / 0.2)
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      icon:
        icon: mdi:transmission-tower-off
        style:
          color: var(--color-error)
      background:
        style:
          background-color: rgb(from var(--color-error) r g b / 0.2)
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      icon:
        icon: mdi:timer-sand
        style:
          opacity: 0.6
          color: var(--color-warning)
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      icon:
        icon: mdi:checkbox-blank-circle-outline
        style:
          opacity: 0.4
          color: var(--color-error)
```

</details>

<!-- END_CONFIG -->

### Example 5: Neon

![Calendar Week Grid Card Example 5: Neon](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_5_neon.png)

<!-- CONFIG:example_5_neon -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
style:
  '--neon-green': '#00E676'
  '--neon-green-shadow': 'rgba(0, 230, 118, 0.3)'
  '--neon-green-bg': 'rgba(0, 230, 118, 0.01)'
  '--neon-grey': '#B0BEC5'
  '--neon-grey-bg': 'rgba(255, 255, 255, 0.03)'
  '--neon-orange': '#FF9800'
  '--neon-orange-grad-1': 'rgba(255, 152, 0, 0.08)'
  '--neon-orange-grad-2': 'rgba(255, 152, 0, 0.15)'
  '--neon-red': '#FF5252'
  '--neon-red-shadow': 'rgba(255, 82, 82, 0.3)'
  '--neon-red-grad-1': 'rgba(244, 67, 54, 0.08)'
  '--neon-red-grad-2': 'rgba(244, 67, 54, 0.15)'
  '--neon-dark-red-bg': 'rgba(183, 28, 28, 0.2)'
  '--neon-light-red': '#FF8A80'
  '--neon-blue-grey': '#90A4AE'
  '--neon-blue-grey-bg': 'rgba(120, 144, 156, 0.05)'
  '--neon-light-blue-bg': 'rgba(3, 169, 244, 0.05)'
  '--neon-light-blue': '#29B6F6'
  '--shadow-color': 'rgba(0,0,0,0.1)'
  border-radius: 12px
  padding: 12px
  box-shadow: 0 4px 6px var(--shadow-color)
grid:
  style:
    gap: 4px
cell:
  style:
    height: 28px
    '--event-border-radius': 6px
  icon:
    style:
      '--mdc-icon-size': 18px
cell_blank:
  icon:
    icon: mdi:lightning-bolt
    style:
      color: var(--neon-green)
      opacity: 0.7
      filter: drop-shadow(0 0 2px var(--neon-green-shadow))
  background:
    style:
      background-color: var(--neon-green-bg)
      border-radius: 6px
cell_filled:
  icon:
    icon: mdi:help-circle
    style:
      color: var(--neon-grey)
  background:
    style:
      background-color: var(--neon-grey-bg)
entities:
  - entity: calendar.probable_outages
    cell:
      background:
        style:
          background-color: transparent
        raw_style: >-
          background: repeating-linear-gradient(45deg, var(--neon-orange-grad-1),
          var(--neon-orange-grad-1) 10px, var(--neon-orange-grad-2) 10px, var(--neon-orange-grad-2) 20px);
      icon:
        icon: mdi:alert-circle-outline
        style:
          color: var(--neon-orange)
          opacity: 0.9
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      background:
        style:
          background-color: transparent
        raw_style: >-
          background: repeating-linear-gradient(45deg, var(--neon-red-grad-1),
          var(--neon-red-grad-1) 10px, var(--neon-red-grad-2) 10px, var(--neon-red-grad-2) 20px);
      icon:
        icon: mdi:power-plug-off
        style:
          color: var(--neon-red)
          filter: drop-shadow(0 0 2px var(--neon-red-shadow))
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      background:
        style:
          background-color: var(--neon-dark-red-bg)
          border: 1px dashed
      icon:
        icon: mdi:transmission-tower-off
        style:
          color: var(--neon-light-red)
          opacity: 1
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      background:
        style:
          background-color: var(--neon-blue-grey-bg)
      icon:
        icon: mdi:timer-sand
        style:
          color: var(--neon-blue-grey)
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      background:
        style:
          background-color: var(--neon-light-blue-bg)
      icon:
        icon: mdi:calendar-check
        style:
          color: var(--neon-light-blue)
```

</details>

<!-- END_CONFIG -->

### Example 6: Soft UI

![Calendar Week Grid Card Example 6: Soft UI](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_6_soft_ui.png)

<!-- CONFIG:example_6_soft_ui -->

<details>
<summary>Configuration</summary>

```yaml
type: custom:calendar-week-grid-card
language: en
time_format: 'HH:mm'
style:
  '--white': '#FFFFFF'
  '--text-color': '#444'
  '--blank-bg': '#F5F5F5'
  '--blank-icon': '#E0E0E0'
  '--probable-bg': '#B9F6CA'
  '--probable-icon': '#1B5E20'
  '--outage-bg': '#FF8A80'
  '--emergency-bg': '#FF80AB'
  '--waiting-bg': '#80DEEA'
  '--waiting-icon': '#006064'
  '--schedule-bg': '#FFF176'
  '--schedule-icon': '#F57F17'
  '--shadow-color': 'rgba(0,0,0,0.1)'
  background: var(--white)
  border-radius: 24px
  padding: 16px
  box-shadow: 0 8px 16px var(--shadow-color)
  '--text-primary': var(--text-color)
  '--text-secondary': var(--text-color)
grid:
  style:
    gap: 8px
cell:
  style:
    height: 34px
    border-radius: 17px
  icon:
    style:
      '--mdc-icon-size': 20px
cell_blank:
  background:
    style:
      background-color: var(--blank-bg)
  icon:
    icon: mdi:check-circle
    style:
      color: var(--blank-icon)
entities:
  - entity: calendar.probable_outages
    cell:
      background:
        style:
          background-color: var(--probable-bg)
      icon:
        icon: mdi:close-circle
        style:
          color: var(--probable-icon)
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      background:
        style:
          background-color: var(--outage-bg)
      icon:
        icon: mdi:close-circle
        style:
          color: var(--white)
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      background:
        style:
          background-color: var(--emergency-bg)
      icon:
        icon: mdi:alert-circle
        style:
          color: var(--white)
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      background:
        style:
          background-color: var(--waiting-bg)
      icon:
        icon: mdi:clock-outline
        style:
          color: var(--waiting-icon)
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      background:
        style:
          background-color: var(--schedule-bg)
      icon:
        icon: mdi:circle-outline
        style:
          color: var(--schedule-icon)
```

</details>

<!-- END_CONFIG -->
