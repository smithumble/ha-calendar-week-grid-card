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

| Name          | Type   | Required | Description                                                    |
| ------------- | ------ | -------- | -------------------------------------------------------------- |
| `type`        | string | **Yes**  | `custom:calendar-week-grid-card`                               |
| `entities`    | list   | **Yes**  | List of calendar entities or objects.                          |
| `language`    | string | No       | Language code for days (e.g., `en`, `fr`).                     |
| `start_hour`  | number | No       | First hour to display (0-23). Default: 0.                      |
| `end_hour`    | number | No       | Last hour to display (0-23). Default: 24.                      |
| `filter`      | string | No       | Global filter text for event summary.                          |
| `grid`        | object | No       | Configuration for the grid container (see Grid Configuration). |
| `cell`        | object | No       | Configuration for cells (see Cell Configuration).              |
| `cell_filled` | object | No       | Configuration for cells with events (see Cell Configuration).  |
| `cell_blank`  | object | No       | Configuration for empty cells (see Cell Configuration).        |
| `style`       | object | No       | CSS styles for the main card.                                  |
| `raw_style`   | string | No       | Raw CSS string for the main card.                              |

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

### Example 1

![Calendar Week Grid Card Example 1](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_1.png)

<!-- CONFIG:example_1 -->

```yaml
type: custom:calendar-week-grid-card
language: uk
start_hour: 6
end_hour: 20
entities:
  - calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Outage
```

<!-- END_CONFIG -->

### Example 2

![Calendar Week Grid Card Example 2](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_2.png)

<!-- CONFIG:example_2 -->

```yaml
type: custom:calendar-week-grid-card
language: uk
cell:
  style:
    height: 24px
    border-radius: 4px
  icon:
    style:
      '--mdc-icon-size': 18px
cell_filled:
  icon:
    icon: mdi:flash-off
    style:
      color: var(--primary-color)
cell_blank:
  icon:
    icon: mdi:flash
    style:
      opacity: 0.2
entities:
  - entity: calendar.probable_outages
    cell:
      icon:
        style:
          color: '#29B6F6'
      background:
        style:
          background-color: '#29B6F6'
          opacity: 0.2
          border-radius: 4px
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      icon:
        style:
          color: red
      background:
        style:
          background-color: red
          opacity: 0.2
          border-radius: 4px
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      icon:
        icon: mdi:flash-off
        style:
          color: red
          opacity: 0.2
      background:
        style:
          background-color: red
          opacity: 0.2
          border-radius: 4px
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      icon:
        icon: mdi:timer-sand
        style:
          color: '#FF9800'
          opacity: 0.2
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      icon:
        icon: mdi:flash
        style:
          color: red
          opacity: 0.2
```

<!-- END_CONFIG -->

### Example 3

![Calendar Week Grid Card Example 3](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_3.png)

<!-- CONFIG:example_3 -->

```yaml
type: custom:calendar-week-grid-card
language: uk
style:
  background: rgba(32, 33, 36, 0.95)
  border-radius: 12px
  padding: 12px
  box-shadow: 0 4px 6px rgba(0,0,0,0.1)
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
      color: '#00E676'
      opacity: 0.7
      filter: drop-shadow(0 0 2px rgba(0, 230, 118, 0.3))
  background:
    style:
      background-color: rgba(0, 230, 118, 0.01)
      border-radius: 6px
cell_filled:
  icon:
    icon: mdi:help-circle
    style:
      color: '#B0BEC5'
  background:
    style:
      background-color: rgba(255, 255, 255, 0.03)
entities:
  - entity: calendar.probable_outages
    cell:
      background:
        style:
          background-color: transparent
        raw_style: >-
          background: repeating-linear-gradient(45deg, rgba(255, 152, 0, 0.08),
          rgba(255, 152, 0, 0.08) 10px, rgba(255, 152, 0, 0.15) 10px, rgba(255,
          152, 0, 0.15) 20px);
      icon:
        icon: mdi:alert-circle-outline
        style:
          color: '#FF9800'
          opacity: 0.9
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      background:
        style:
          background-color: transparent
          border: 1px solid rgba(244, 67, 54, 0.1)
        raw_style: >-
          background: repeating-linear-gradient(45deg, rgba(244, 67, 54, 0.08),
          rgba(244, 67, 54, 0.08) 10px, rgba(244, 67, 54, 0.15) 10px, rgba(244,
          67, 54, 0.15) 20px);
      icon:
        icon: mdi:power-plug-off
        style:
          color: '#FF5252'
          filter: drop-shadow(0 0 2px rgba(255, 82, 82, 0.3))
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      background:
        style:
          background-color: rgba(183, 28, 28, 0.2)
          border: 1px dashed #FF1744
      icon:
        icon: mdi:transmission-tower-off
        style:
          color: '#FF8A80'
          opacity: 1
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      background:
        style:
          background-color: rgba(120, 144, 156, 0.05)
      icon:
        icon: mdi:timer-sand
        style:
          color: '#90A4AE'
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      background:
        style:
          background-color: rgba(3, 169, 244, 0.05)
      icon:
        icon: mdi:calendar-check
        style:
          color: '#29B6F6'
```

<!-- END_CONFIG -->

### Example 4

![Calendar Week Grid Card Example 4](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/example_4.png)

<!-- CONFIG:example_4 -->

```yaml
type: custom:calendar-week-grid-card
language: en
style:
  background: '#FFFFFF'
  border-radius: 24px
  padding: 16px
  box-shadow: 0 8px 16px rgba(0,0,0,0.1)
  '--text-primary': '#444'
  '--text-secondary': '#444'
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
      background-color: '#F5F5F5'
  icon:
    icon: mdi:check-circle
    style:
      color: '#E0E0E0'
entities:
  - entity: calendar.probable_outages
    cell:
      background:
        style:
          background-color: '#B9F6CA'
      icon:
        icon: mdi:close-circle
        style:
          color: '#1B5E20'
  - entity: calendar.planned_outages
    filter: Outage
    cell:
      background:
        style:
          background-color: '#FF8A80'
      icon:
        icon: mdi:close-circle
        style:
          color: '#FFFFFF'
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
    cell:
      background:
        style:
          background-color: '#FF80AB'
      icon:
        icon: mdi:alert-circle
        style:
          color: '#FFFFFF'
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
    cell:
      background:
        style:
          background-color: '#80DEEA'
      icon:
        icon: mdi:clock-outline
        style:
          color: '#006064'
  - entity: calendar.planned_outages
    filter: Schedule Applies
    cell:
      background:
        style:
          background-color: '#FFF176'
      icon:
        icon: mdi:circle-outline
        style:
          color: '#F57F17'
```

<!-- END_CONFIG -->
