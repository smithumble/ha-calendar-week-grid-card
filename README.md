# HA Calendar Week Grid Card

A custom Home Assistant card that displays calendar events in a week grid format.

![Calendar Week Grid Card Screenshot](https://media.githubusercontent.com/media/smithumble/ha-calendar-week-grid-card/main/media/images/yasno-example.png)

## Installation

### HACS

1. Go to _HACS_ → _3 dots_ → _Custom repositories_.
2. Add this repository.
3. Install.

### Manual

1. Download `dist/calendar-week-grid-card.js`.
2. Place it in your `www` folder (e.g. `/config/www/calendar-week-grid-card.js`).
3. Add a reference to `calendar-week-grid-card.js`. There are two ways to do that:

#### Using UI

1. Go to _Settings_ → _Dashboards_ → _3 dots (top right)_ → _Resources_.
2. Click the **Add Resource** button.
3. Set _Url_ to `/local/calendar-week-grid-card.js`.
4. Set _Resource type_ to `JavaScript Module`.

> [!NOTE]
> If you do not see the Resources Tab, you will need to enable _Advanced Mode_ in your _User Profile_.

#### Using YAML

Add the following to your `configuration.yaml`:

```yaml
lovelace:
  resources:
    - url: /local/calendar-week-grid-card.js
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
| `icon`               | string | Icon to display.                       |
| `icon_size`          | string | Size of the icon (e.g., `18px`).       |
| `color`              | string | Icon color.                            |
| `opacity`            | number | Icon opacity (0-1).                    |
| `background_color`   | string | Background color of the event block.   |
| `background_opacity` | number | Background opacity of the event block. |

### Entity Configuration

You can provide entities as simple strings or objects for more control:

```yaml
entities:
  - calendar.family
  - entity: calendar.work
    name: Work
    filter: 'Meeting' # Only show events containing "Meeting"
    cell:
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
  icon_size: 18px
cell_filled:
  icon: mdi:flash-off
  color: var(--primary-color)
  background_opacity: 0.2
cell_blank:
  opacity: 0.2
  icon: mdi:flash
entities:
  - entity: calendar.yasno_kiiv_dtek_6_1_probable_outages
    cell:
      background_color: var(--primary-color)
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Outage
    cell:
      color: red
      background_color: red
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Emergency Shutdowns
    icon: mdi:flash-off
    cell:
      color: red
      background_color: red
      opacity: 0.2
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Waiting for Schedule
    cell:
      icon: mdi:clock
      color: var(--warning-color)
      opacity: 0.2
  - entity: calendar.yasno_kiiv_dtek_6_1_planned_outages
    filter: Schedule Applies
    cell:
      icon: mdi:flash
      color: var(--error-color)
      opacity: 0.2
```
