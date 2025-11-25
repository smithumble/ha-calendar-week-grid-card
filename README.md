# HA Calendar Week Grid Card

A custom Home Assistant card that displays calendar events in a week grid format.

![Calendar Week Grid Card Screenshot](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/yasno-example.png)

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

![Calendar Week Grid Card Screenshot](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/yasno-example.png)

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
