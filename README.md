# HA Calendar Week Grid Card

A custom Home Assistant card that displays calendar events in a week grid format.

![Calendar Week Grid Card Screenshot](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/image.png)

## Installation

### HACS Installation (Recommended)

The easiest way to install **Calendar Week Grid Card** is via **[HACS (Home Assistant Community Store)](https://hacs.xyz/)**.

[![Open in HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=smithumble&repository=ha-calendar-week-grid-card&category=plugin)

#### Steps:

1. Ensure **[HACS](https://hacs.xyz/docs/setup/download)** is installed in Home Assistant.
2. Go to **HACS → Frontend → Custom Repositories**.
3. Add this repository: `https://github.com/smithumble/ha-calendar-week-grid-card` as type `Dashboard`
4. Install **Calendar Week Grid Card** from HACS.
5. **Clear your browser cache** and reload Home Assistant.

### Manual Installation

1. **Download** the latest release: [calendar-week-grid-card.js](https://github.com/smithumble/ha-calendar-week-grid-card/releases/latest)
2. Place it in your `www` folder (e.g. `/config/www/calendar-week-grid-card.js`).
3. Add a reference to `calendar-week-grid-card.js`.

There are two ways to do that:

#### Using UI

1. Go to _Settings_ → _Dashboards_ → _3 dots (top right)_ → _Resources_.
2. Click the **Add Resource** button.
3. Set _Url_ to `/local/calendar-week-grid-card.js`.
4. Set _Resource type_ to `JavaScript Module`.

> [!NOTE]
> If you do not see the Resources Tab, you will need to enable _Advanced Mode_ in your _User Profile_.

#### Using YAML

Add the resource to your Lovelace Dashboard:

```yaml
url: /local/calendar-week-grid-card.js
type: module
```

## Configuration

| Name          | Type   | Required | Description                                              |
| ------------- | ------ | -------- | -------------------------------------------------------- |
| `type`        | string | **Yes**  | `custom:calendar-week-grid-card`                         |
| `entities`    | list   | **Yes**  | List of calendar entities or objects.                    |
| `language`    | string | No       | Language code for days (e.g., `en`, `fr`).               |
| `start_hour`  | number | No       | First hour to display (0-23). Default: 0.                |
| `end_hour`    | number | No       | Last hour to display (0-23). Default: 24.                |
| `filter`      | string | No       | Global filter text for event summary.                    |
| `cell`        | object | No       | Global configuration for cells (see Cell Configuration). |
| `cell_filled` | object | No       | Configuration for cells with events.                     |
| `cell_blank`  | object | No       | Configuration for empty cells.                           |

### Cell Configuration

Configuration object for `cell`, `cell_filled` and `cell_blank`:

| Name                 | Type   | Description                            |
| -------------------- | ------ | -------------------------------------- |
| `height`             | string | Height of the cell (e.g., `30px`).     |
| `icon.icon`          | string | Icon to display.                       |
| `icon.size`          | string | Size of the icon (e.g., `18px`).       |
| `icon.color`         | string | Icon color.                            |
| `icon.opacity`       | number | Icon opacity (0-1).                    |
| `background.color`   | string | Background color of the event block.   |
| `background.opacity` | number | Background opacity of the event block. |

### Entity Configuration

You can provide entities as simple strings or objects for more control:

```yaml
entities:
  - calendar.family
  - entity: calendar.work
    name: Work
    filter: 'Meeting' # Only show events containing "Meeting"
    cell:
      icon:
        color: '#ff0000'
        icon: 'mdi:briefcase'
```

## Example

```yaml
type: custom:calendar-week-grid-card
entities:
  - calendar.personal
  - calendar.holidays
cell:
  height: 30px
```

## Example with [HA Yasno Outages](https://github.com/denysdovhan/ha-yasno-outages)

> [!NOTE]
> The examples use the [HA Yasno Outages](https://github.com/denysdovhan/ha-yasno-outages) integration calendar, which shows outages in Ukraine caused by Russian attacks on civilian and energy infrastructure during the invasion of Ukraine.

### Example 1

![Calendar Week Grid Card Example 1](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_1.png)

```yaml
type: custom:calendar-week-grid-card
language: uk
cell:
  height: 24px
  icon:
    size: 18px
cell_filled:
  icon:
    icon: mdi:flash-off
    color: var(--primary-color)
  background:
    opacity: 0.2
cell_blank:
  icon:
    icon: mdi:flash
    opacity: 0.2
entities:
  - entity: calendar.yasno_kiiv_dtek_6_1_probable_outages
    cell:
      background:
        color: var(--primary-color)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Outage
    cell:
      icon:
        color: red
      background:
        color: red
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Emergency Shutdowns
    cell:
      icon:
        icon: mdi:flash-off
        color: red
        opacity: 0.2
      background:
        color: red
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Waiting for Schedule
    cell:
      icon:
        icon: mdi:clock
        color: var(--warning-color)
        opacity: 0.2
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Schedule Applies
    cell:
      icon:
        icon: mdi:flash
        color: var(--error-color)
        opacity: 0.2
```

### Example 2

![Calendar Week Grid Card Example 2](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_2.png)

```yaml
type: custom:calendar-week-grid-card
language: uk

# Global Card Styling
style:
  background: 'rgba(32, 33, 36, 0.95)' # Dark background
  border-radius: '12px'
  padding: '12px'
  box-shadow: '0 4px 6px rgba(0,0,0,0.1)'

grid:
  style:
    gap: '4px' # Space between cells

cell:
  height: 28px
  icon:
    size: 18px
  style:
    border-radius: '6px'

# 🟢 POWER ON (Blank/Empty Cells)
cell_blank:
  icon:
    icon: mdi:lightning-bolt
    color: '#00E676' # Neon Green
    opacity: 0.7
    style:
      filter: 'drop-shadow(0 0 2px rgba(0, 230, 118, 0.3))'
  background:
    color: 'rgba(0, 230, 118, 0.08)' # Very faint green tint
    style:
      border-radius: '6px'

# ⚪️ DEFAULT EVENT (Fallback)
cell_filled:
  icon:
    icon: mdi:help-circle
    color: '#B0BEC5'
  background:
    color: 'rgba(255, 255, 255, 0.05)'

entities:
  # 🟠 PROBABLE OUTAGES (Striped Pattern)
  - entity: calendar.yasno_kiiv_dtek_6_1_probable_outages
    cell:
      background:
        color: transparent
        # Diagonal stripes
        raw_style: 'background: repeating-linear-gradient(45deg, rgba(255, 152, 0, 0.15), rgba(255, 152, 0, 0.15) 10px, rgba(255, 152, 0, 0.25) 10px, rgba(255, 152, 0, 0.25) 20px);'
      icon:
        icon: mdi:alert-circle-outline
        color: '#FF9800'
        opacity: 1

  # 🔴 PLANNED OUTAGE (Gradient Red)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Outage
    cell:
      background:
        color: transparent
        # Vertical gradient
        raw_style: 'background: linear-gradient(180deg, rgba(244, 67, 54, 0.25) 0%, rgba(211, 47, 47, 0.45) 100%); border: 1px solid rgba(244,67,54,0.1);'
      icon:
        icon: mdi:power-plug-off
        color: '#FF5252' # Neon Red
        style:
          filter: 'drop-shadow(0 0 4px rgba(255, 82, 82, 0.4))'

  # ⛔️ EMERGENCY (Dark Red)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Emergency Shutdowns
    cell:
      background:
        color: 'rgba(183, 28, 28, 0.5)'
        raw_style: 'border: 1px dashed #FF1744;'
      icon:
        icon: mdi:transmission-tower-off
        color: '#FF8A80'
        opacity: 1

  # ⏳ WAITING FOR SCHEDULE (Grey/Blue)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Waiting for Schedule
    cell:
      background:
        color: 'rgba(120, 144, 156, 0.2)'
      icon:
        icon: mdi:timer-sand
        color: '#90A4AE'

  # 📋 SCHEDULE APPLIES (Teal/Info)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Schedule Applies
    cell:
      background:
        color: 'rgba(3, 169, 244, 0.15)'
      icon:
        icon: mdi:calendar-check
        color: '#29B6F6'
```
