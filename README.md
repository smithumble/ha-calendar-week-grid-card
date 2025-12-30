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

| Name              | Type   | Required | Description                                                                                |
| ----------------- | ------ | -------- | ------------------------------------------------------------------------------------------ |
| `type`            | string | **Yes**  | `custom:calendar-week-grid-card`                                                           |
| `entities`        | list   | **Yes**  | List of calendar entities or objects.                                                      |
| `language`        | string | No       | Language code for days (e.g., `en`, `fr`).                                                 |
| `time_format`     | string | No       | Time format pattern (e.g., `h A`, `HH:mm`).                                                |
| `start_hour`      | number | No       | First hour to display (0-23). Default: 0.                                                  |
| `end_hour`        | number | No       | Last hour to display (0-23). Default: 24.                                                  |
| `filter`          | string | No       | Global filter text for event summary.                                                      |
| `icons_container` | string | No       | Where to render icons: `cell` (in the cell) or `event` (in event blocks). Default: `cell`. |
| `icons_mode`      | string | No       | Which events show icons: `top` (only main event) or `all` (all events). Default: `top`.    |
| `css`             | string | No       | CSS styles for the card.                                                                   |

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

| Name     | Type   | Required | Description                                      |
| -------- | ------ | -------- | ------------------------------------------------ |
| `entity` | string | **Yes**  | The entity_id of the calendar.                   |
| `name`   | string | No       | Friendly name for the entity (currently unused). |
| `filter` | string | No       | Filter text for events.                          |

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
  - calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Outage
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
entities:
  - entity: calendar.planned_outages
    filter: Outage
  - entity: calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
  - entity: calendar.planned_outages
    filter: Schedule Applies
css: |
  ha-card {
    --event-border-radius: 4px;
    --main-color: var(--primary-text-color);
  }

  .cell {
    .event-block {
      border: 1px dotted rgb(from var(--main-color) r g b / 0.3);
    }

    &:not(.has-event) ha-icon {
      --icon: mdi:checkbox-blank-circle-outline;
      opacity: 0.3;
    }

    [data-entity="calendar.planned_outages"] {
      color: var(--main-color);

      &[data-filter="Outage"] {
        &.event-icon {
          --icon: mdi:flash-off;
        }

        .event-block {
          border: 1px solid var(--main-color);
        }

        .event-sub-block {
          background-color: rgb(from var(--main-color) r g b / 0.3);
        }
      }

      &[data-filter="Emergency Shutdowns"] {
        &.event-icon {
          --icon: mdi:transmission-tower-off;
        }

        .event-block {
          border: 1px double var(--main-color);
        }

        .event-sub-block {
          background-color: rgb(from var(--main-color) r g b / 0.2);
        }
      }

      &[data-filter="Waiting for Schedule"] {
        &.event-icon {
          --icon: mdi:timer-sand;
          opacity: 0.4;
        }

        .event-block {
          opacity: 0.4;
          border: 1px dotted var(--main-color);
        }

        .event-sub-block {
          background-color: rgb(from var(--main-color) r g b / 0.1);
        }
      }

      &[data-filter="Schedule Applies"] {
        &.event-icon {
          --icon: mdi:calendar-check;
          opacity: 0.4;
        }

        .event-block {
          opacity: 0.4;
          border: 1px dotted var(--main-color);
        }

        .event-sub-block {
          background-color: rgb(from var(--main-color) r g b / 0.1);
        }
      }
    }

    [data-entity="calendar.probable_outages"] {
      &.event-icon {
        --icon: mdi:alert-circle-outline;
        color: var(--main-color);
      }

      .event-block {
        border: 1px dashed var(--main-color);
      }

      .event-sub-block {
        background-color: rgb(from var(--main-color) r g b / 0.1);
      }
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
entities:
  - entity: calendar.planned_outages
    filter: Outage
  - entity: calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
  - entity: calendar.planned_outages
    filter: Schedule Applies
css: |
  ha-card {
    --event-border-radius: 4px;
    --color-neutral: var(--secondary-text-color);
    --color-warning: var(--warning-color);
    --color-error: var(--error-color);
    --color-info: var(--info-color);
    --color-success: var(--success-color);
  }

  .cell {
    .event-block {
      border: 1px dotted rgb(from var(--color-neutral) r g b / 0.3);
    }

    &:not(.has-event) ha-icon {
      --icon: mdi:checkbox-blank-circle-outline;
      opacity: 0.3;
    }

    [data-entity="calendar.planned_outages"] {
      &[data-filter="Outage"] {
        &.event-icon {
          --icon: mdi:flash-off;
          color: var(--color-error);
        }

        .event-block {
          border: 1px solid var(--color-error);
        }

        .event-sub-block {
          background-color: rgb(from var(--color-error) r g b / 0.1);
        }
      }

      &[data-filter="Emergency Shutdowns"] {
        &.event-icon {
          --icon: mdi:transmission-tower-off;
          color: var(--color-error);
        }

        .event-block {
          border: 1px double var(--color-error);
        }

        .event-sub-block {
          background-color: rgb(from var(--color-error) r g b / 0.2);
        }
      }

      &[data-filter="Waiting for Schedule"] {
        &.event-icon {
          --icon: mdi:timer-sand;
          opacity: 0.4;
          color: var(--color-info);
        }

        .event-block {
          opacity: 0.4;
          border: 1px dotted var(--color-info);
        }

        .event-sub-block {
          background-color: rgb(from var(--color-info) r g b / 0.1);
        }
      }

      &[data-filter="Schedule Applies"] {
        &.event-icon {
          --icon: mdi:calendar-check;
          opacity: 0.4;
          color: var(--color-success);
        }

        .event-block {
          opacity: 0.4;
          border: 1px dotted var(--color-info);
        }

        .event-sub-block {
          background-color: rgb(from var(--color-success) r g b / 0.1);
        }
      }
    }

    [data-entity="calendar.probable_outages"] {
      &.event-icon {
        --icon: mdi:alert-circle-outline;
        color: var(--color-warning);
      }

      .event-block {
        border: 1px dashed var(--color-warning);
      }

      .event-sub-block {
        background-color: rgb(from var(--color-warning) r g b / 0.1);
      }
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
entities:
  - entity: calendar.planned_outages
    filter: Outage
  - entity: calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
  - entity: calendar.planned_outages
    filter: Schedule Applies
css: |
  ha-card {
    --event-border-radius: 4px;
    --color-neutral: var(--secondary-text-color);
    --color-warning: #FF9800;
    --color-error: #FF0000;
    --color-info: #29B6F6;
    --color-success: var(--success-color);
  }

  .cell {
    &:not(.has-event) ha-icon {
      --icon: mdi:checkbox-blank-circle-outline;
      opacity: 0.3;
    }

    [data-entity="calendar.planned_outages"] {
      color: var(--color-error);

      &[data-filter="Outage"] {
        &.event-icon {
          --icon: mdi:flash-off;
        }

        .event-sub-block {
          background-color: rgb(from var(--color-error) r g b / 0.2);
        }
      }

      &[data-filter="Emergency Shutdowns"] {
        &.event-icon {
          --icon: mdi:transmission-tower-off;
        }
        .event-sub-block {
          background-color: rgb(from var(--color-error) r g b / 0.2);
        }
      }

      &[data-filter="Waiting for Schedule"] {
        &.event-icon {
          --icon: mdi:timer-sand;
          opacity: 0.6;
          color: var(--color-warning);
        }
      }

      &[data-filter="Schedule Applies"] {
        &.event-icon {
          --icon: mdi:checkbox-blank-circle-outline;
          opacity: 0.4;
        }
      }
    }

    [data-entity="calendar.probable_outages"] {
      &.event-icon {
        --icon: mdi:alert-circle-outline;
        color: var(--color-info);
      }

      .event-sub-block {
        background-color: rgb(from var(--color-info) r g b / 0.2);
      }
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
entities:
  - entity: calendar.planned_outages
    filter: Outage
  - entity: calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
  - entity: calendar.planned_outages
    filter: Schedule Applies
css: |
  ha-card {
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
    border-radius: 12px;
    padding: 12px;
    box-shadow: 0 4px 6px var(--shadow-color);
  }

  .grid-container {
    gap: 4px;
  }

  .cell {
    height: 28px;
    --event-border-radius: 6px;

    ha-icon {
      --mdc-icon-size: 18px;
    }

    .event-block {
      background-color: var(--neon-green-bg);
      border-radius: 6px;
    }

    &:not(.has-event) ha-icon {
      --icon: mdi:lightning-bolt;
      color: var(--neon-green);
      opacity: 0.7;
      filter: drop-shadow(0 0 2px var(--neon-green-shadow));
    }

    .event-block-wrapper[data-entity] {
      ha-icon {
        --icon: mdi:help-circle;
        color: var(--neon-grey);
      }

      .event-sub-block {
        background-color: var(--neon-grey-bg);
      }
    }

    [data-entity="calendar.planned_outages"] {
      &[data-filter="Outage"] {
        &.event-icon {
          --icon: mdi:power-plug-off;
          color: var(--neon-red);
          filter: drop-shadow(0 0 2px var(--neon-red-shadow));
        }

        .event-sub-block {
          background: repeating-linear-gradient(45deg, var(--neon-red-grad-1),
            var(--neon-red-grad-1) 10px, var(--neon-red-grad-2) 10px, var(--neon-red-grad-2) 20px);
        }
      }

      &[data-filter="Emergency Shutdowns"] {
        &.event-icon {
          --icon: mdi:transmission-tower-off;
          color: var(--neon-light-red);
          opacity: 1;
        }

        .event-sub-block {
          background-color: var(--neon-dark-red-bg);
        }
      }

      &[data-filter="Waiting for Schedule"] {
        &.event-icon {
          --icon: mdi:timer-sand;
          color: var(--neon-blue-grey);
        }

        .event-sub-block {
          background-color: var(--neon-blue-grey-bg);
        }
      }

      &[data-filter="Schedule Applies"] {
        &.event-icon {
          --icon: mdi:calendar-check;
          color: var(--neon-light-blue);
        }

        .event-sub-block {
          background-color: var(--neon-light-blue-bg);
        }
      }
    }

    [data-entity="calendar.probable_outages"] {
      &.event-icon {
        --icon: mdi:alert-circle-outline;
        color: var(--neon-orange);
        opacity: 0.9;
      }

      .event-sub-block {
        background: repeating-linear-gradient(45deg, var(--neon-orange-grad-1),
          var(--neon-orange-grad-1) 10px, var(--neon-orange-grad-2) 10px, var(--neon-orange-grad-2) 20px);
      }
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
entities:
  - entity: calendar.planned_outages
    filter: Outage
  - entity: calendar.probable_outages
  - entity: calendar.planned_outages
    filter: Emergency Shutdowns
  - entity: calendar.planned_outages
    filter: Waiting for Schedule
  - entity: calendar.planned_outages
    filter: Schedule Applies
css: |
  ha-card {
    --white: #FFFFFF;
    --text-color: #444;
    --blank-bg: #F5F5F5;
    --blank-icon: #E0E0E0;
    --probable-bg: #B9F6CA;
    --probable-icon: #1B5E20;
    --outage-bg: #FF8A80;
    --emergency-bg: #FF80AB;
    --waiting-bg: #80DEEA;
    --waiting-icon: #006064;
    --schedule-bg: #FFF176;
    --schedule-icon: #F57F17;
    --shadow-color: rgba(0,0,0,0.1);
    background: var(--white);
    border-radius: 24px;
    padding: 16px;
    box-shadow: 0 8px 16px var(--shadow-color);
    --text-primary: var(--text-color);
    --text-secondary: var(--text-color);
  }

  .grid-container {
    gap: 8px;
  }

  .cell {
    height: 34px;
    border-radius: 17px;

    ha-icon {
      --mdc-icon-size: 20px;
    }

    .event-block {
      background-color: var(--blank-bg);
    }

    .event-block-blank ha-icon {
      --icon: mdi:circle-outline;
      color: var(--blank-icon);
    }

    [data-entity="calendar.planned_outages"] {
      &[data-filter="Outage"] {
        &.event-icon {
          --icon: mdi:close-circle;
          color: var(--white);
        }

        .event-block {
          background-color: var(--outage-bg);
        }
      }

      &[data-filter="Emergency Shutdowns"] {
        &.event-icon {
          --icon: mdi:alert-circle;
          color: var(--white);
        }

        .event-block {
          background-color: var(--emergency-bg);
        }
      }

      &[data-filter="Waiting for Schedule"] {
        &.event-icon {
          --icon: mdi:clock-outline;
          color: var(--waiting-icon);
        }

        .event-block {
          background-color: var(--waiting-bg);
        }
      }

      &[data-filter="Schedule Applies"] {
        &.event-icon {
          --icon: mdi:circle-outline;
          color: var(--schedule-icon);
        }

        .event-block {
          background-color: var(--schedule-bg);
        }
      }
    }

    [data-entity="calendar.probable_outages"] {
      &.event-icon {
        --icon: mdi:close-circle;
        color: var(--probable-icon);
      }

      .event-block {
        background-color: var(--probable-bg);
      }
    }
  }
```

</details>

<!-- END_CONFIG -->
