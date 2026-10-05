# RigWatch Industrial Operations Console UX Brief

## Purpose

RigWatch is a small, simulated drilling telemetry application built for learning and interview discussion. This brief defines a redesign from a modern SaaS dashboard into a believable drilling operations console.

RigWatch uses fake data. It is not a Pason product, does not use real Pason data, and is not intended for operational control or well-control decisions.

Use the references in this document for information hierarchy and industrial UX patterns, not as templates to reproduce. The final design must have its own visual identity and must not imply affiliation with Pason, Halliburton, SLB, Corva, NOV, or any other vendor.

## Design objective

The interface should communicate this hierarchy in order:

```text
operator console
  → rig and well identity
  → current drilling state
  → process/equipment relationship
  → critical telemetry
  → alarms and required response
  → historical analysis
  → simulator controls
```

An interviewer or operator should be able to answer these questions within five seconds:

1. Which rig and well am I looking at?
2. What is the rig doing right now?
3. Is the system healthy, abnormal, or missing data?
4. What are the current WOB, pressure, pit-volume, and ROP values?
5. Is there an active alarm, and what should I do next?

## 1. Review of the current interface

### What currently feels like a SaaS or AI-generated dashboard

- The large hero area and marketing-style subtitle use valuable operator screen space without improving situational awareness.
- Four equal, rounded cards make every measurement appear equally important. A real operator view should emphasize relationships and exceptions.
- Charts contain substantial unused vertical space and do not consistently show time, depth, sample age, or operating context.
- The bright mint `Inject kick event` button looks like a primary production command. It is actually a simulator/instructor action and should be labeled and placed accordingly.
- The status strip contains useful information, but rig identity, operational state, connection health, data quality, and alarms do not have a clear priority order.
- There is no process relationship between pumps, standpipe, wellbore, returns, and pits. The user sees measurements but not the process they describe.
- The dark gradient, large rounded panels, mint accent, and spacious composition resemble a polished SaaS analytics template more than an industrial HMI.
- The alarm history and pit-chart markers are useful foundations. They should remain, but alarms need severity, state, acknowledgement, clear time, source context, and response-oriented placement.

### What is already working

- The dashboard is intentionally small and easy to explain.
- The four current measurements are relevant to a drilling demonstration.
- The scenario selector makes the simulator easy to demo.
- The kick threshold, five-second change line, and event marker make the core alarm logic visible.
- Active, acknowledged, and cleared alarm states are understandable.
- Missing sensor data is represented as a quality problem instead of silently being treated as a valid value.
- The offline buffer is visible and explainable.
- The page already exposes accessible labels and text states rather than relying on color alone.

## 2. Research references

These references are used to study operational patterns. Their products, visual identities, terminology, and imagery should not be copied.

| Reference | What makes it operationally credible | Patterns to borrow conceptually | Do not copy |
| --- | --- | --- | --- |
| [Pason Electronic Drilling Recorder](https://pason.com/products/electronic-drilling-recorder-edr/) | Treats drilling data as a shared real-time dataset for rig personnel, mud loggers, directional drillers, and office users. | High-frequency traces, custom traces, shared context, messages, and role-aware information. | Pason branding, product structure, or any claim that RigWatch connects to Pason. |
| [Halliburton LOGIX drilling performance](https://www.halliburton.com/en/products/logix-drilling-performance) | Connects real-time drilling data with steering, performance, visualization, and operational decisions. | Put a measurement beside the operational context or action it informs. | Autonomous-drilling claims, branding, and complex downhole capabilities RigWatch does not model. |
| [SLB DrillOps data aggregation](https://www.slb.com/products-and-services/delivering-digital-at-scale/software/delfi/delfi-solutions/drillops/drillops-data-aggregation-and-delivery) | Emphasizes vendor-neutral data aggregation, data quality, WITSML context, and rig/office visualization. | Make data provenance, quality, units, and context visible instead of treating values as anonymous numbers. | DELFI branding, cloud architecture claims, or unsupported integrations. |
| [EdgeKinect Oil & Gas SCADA](https://edgekinect.com/live-demos/scada-oil-gas) | Uses a process-oriented SCADA view with pumps, drill-bit telemetry, mud flow, BOP state, tanks, and alarms. | Use a simple process mimic so values are connected to equipment and flow. | Their widget layout, live deployment, or visual identity. |
| [Vertechs IPC-MPD](https://www.vertechs.com/drilling-solutions/ipc-mpd-managed-pressure-drilling) | Frames pressure control around multiple variables, response time, control modes, and operating margins. | Show pressure-related values together and distinguish a value from its acceptable envelope. | MPD automation claims or pressure-control controls that RigWatch does not implement. |
| [Vertechs REALology fluid monitoring](https://vertechs.com/fluids-monitoring/realology-intelligent-drilling-fluids-monitoring-system) | Treats mud density, rheology, pH, chloride, and temperature as fluid-system context rather than isolated KPIs. | Use a separate mud-system area for fluid quality and pit behavior when those fields exist. | Real fluid measurements; RigWatch must label its data simulated. |
| [Baker Hughes WellLink Real Time](https://www.bakerhughes.com/oilfield-services-and-equipment-digital/autonomous-well-construction/welllink-real-time) | Aggregates wellsite sources and supports real-time browser/mobile monitoring, alerts, collaboration, and audit context. | Make sample age, source health, and event history visible across desktop and mobile. | Multi-vendor integration claims or Baker Hughes product language. |
| [Baker Hughes WellLink Performance](https://www.bakerhughes.com/oilfield-services-and-equipment-digital/autonomous-well-construction/welllink-performance) | Uses KPIs, planned-versus-actual comparisons, benchmarking, and performance trends. | Reserve a trend workspace for contextual analysis, not just live cards. | Benchmarking claims until RigWatch has plan/offset data. |
| [Corva drilling platform](https://www.corva.ai/energy/corva-for-civitas) | Uses drilling-specific plots such as hookload and torque views and focuses on real-time operational decisions. | Group related drilling parameters and use domain-specific trend names. | Corva visual language, product claims, or unsupported analytics. |
| [NOV RigOptix](https://www.nov.com/products/rigoptix) | Organizes information around equipment health, condition, behavior, and maintenance decisions. | Treat equipment as an object with state, quality, and history instead of as a generic card. | NOV equipment imagery, logos, or condition-monitoring claims beyond the simulator. |
| [NOV Wireless Process Navigator](https://assets.nov.com/NCP4N68N/at/779rnjcgn86578nq5jw78c/26-103220-RT-Wireless_Process_Navigator_WPN_Flyer-FLYR_WEB.pdf) | Combines equipment/status tables, real-time trends, field context, and alarm acknowledgement. | Use compact status rows and explicit acknowledgement actions for operator workflows. | Field-control affordances; RigWatch controls must remain visibly simulated. |
| [AVEVA System Platform](https://www.aveva.com/en/products/system-platform.md/) | Brings real-time process data, alarms, trends, and equipment context together through reusable industrial objects. | Design panels around reusable assets and consistent state treatment. | AVEVA graphics, asset names, and enterprise-scale claims. |
| [Ignition alarm status and history](https://docs.inductiveautomation.com/docs/7.9/alarming/alarm-status/alarm-status-tag-history-and-alarm-history) | Shows active, acknowledged, and cleared alarm states alongside the trend where the event occurred. | Link event rows to a trace and show alarm lifecycle on the time axis. | Ignition component styling or claims that RigWatch has a historian/database. |
| [DrillSIM:5000 Classic](https://www.3tglobal.com/3t-drilling-systems/drillsim5000-classic/) | Aligns simulator displays with driller-console concepts and supports realistic well-control scenarios. | Keep simulator controls separate, explicit, and scenario-oriented; show the process consequences. | 3D rig graphics, training claims, or a copied console layout. |

### Research conclusions

Across the references, credible industrial interfaces consistently do the following:

- Put asset identity, operating state, data health, and alarms above decorative branding.
- Group values by process relationship instead of giving every tag the same visual weight.
- Use process mimics, equipment states, tables, and trend context to explain what a value means.
- Treat alarms as lifecycle events: active, acknowledged, cleared, and sometimes shelved or suppressed.
- Show historical context directly beside an abnormal event.
- Use color for exception states, not as decoration for every panel.
- Keep operator controls distinct from monitoring and analysis.

## 3. Desktop screen architecture

The primary target is a 1440×900 desktop view. The first screen should be useful without scrolling.

### Persistent header

Replace the large hero with a compact operations header containing:

- Rig: `NORTH STAR`
- Rig number: `RIG 07`
- Well identifier: simulated value such as `WELL A-01`
- Operation: `DRILLING`
- Current depth when modeled
- Local time and elapsed simulation time
- Last sample age
- Connection state: `LIVE`, `OFFLINE`, or `REPLAYING`
- Data quality state
- Active alarm count

The header remains visible while the operator scans the rest of the screen.

### Operational status strip

Use a compact state strip immediately below the header:

```text
SYSTEM NOMINAL   DRILLING   DATA QUALITY NOMINAL   LAST SAMPLE 0.8 s AGO   ACTIVE ALARMS 0
```

If an alarm or quality issue exists, show the icon, text, severity, and count. Do not rely on a colored background alone.

### Main process mimic

Use a read-only horizontal process path:

```text
[ MUD PUMPS ] → [ STANDPIPE ] → [ WELLBORE / BIT ] → [ RETURNS ] → [ SHAKERS / PITS ]
```

The mimic should show only supported values:

- Pump pressure at the pump/standpipe area.
- Pit volume at the pits area.
- Scenario state beside the affected equipment.
- Data quality or missing-value indicators on the affected tag.
- Buffer/replay state near the data path, not as a decorative KPI.

Do not add clickable valves, pump speed controls, BOP controls, or choke commands unless the simulator actually implements those behaviors.

### Critical telemetry lanes

Use compact instrumentation rows or grouped panels instead of four equal cards.

#### Drilling parameters

- Weight on bit: current value, unit, delta, trend direction, sample age.
- Rate of penetration: current value, unit, delta, trend direction, sample age.
- Rotary speed and torque only after the simulator models them.

#### Hydraulics and mud system

- Pump/standpipe pressure.
- Mud pit volume.
- Flow in and flow out only after the simulator models them.
- Five-second pit-volume delta and kick threshold.

Each measurement must show whether it is normal, abnormal, missing, stale, or replayed.

### Alarm and event rail

Place the alarm rail on the right side of the desktop screen or directly beneath the status strip when width is limited.

Ordering:

1. Active critical alarms.
2. Active warnings.
3. Unacknowledged advisories.
4. Acknowledged alarms whose conditions remain active.
5. Recently cleared events.
6. Data-quality events.

Each event row contains:

- Severity icon and text.
- Alarm message.
- Source tag or process element.
- Active/acknowledged/cleared state.
- Created, acknowledged, and cleared timestamps when available.
- Acknowledge action for active alarms.
- Link or focus action to the related chart/process element.

### Trend workspace

Use a shared time axis and compact horizontal plot lanes:

- WOB / ROP / RPM.
- Pump pressure / flow.
- Pit volume / flow in / flow out.

Chart requirements:

- Visible time labels; add depth labels when depth is modeled.
- Units on each lane.
- Threshold and operating-envelope lines.
- Alarm-event markers aligned to the same x-position as the event row.
- Missing readings rendered as gaps.
- Stale readings rendered with a visible stale indicator.
- Selected trace emphasized; inactive traces use lower contrast.
- No smoothed curve that hides a sudden kick or pressure loss.

### Simulator/instructor controls

Move scenario selection and `Inject kick event` into a section labeled:

```text
SIMULATOR / INSTRUCTOR CONTROLS
```

The kick action remains available for interviews, but it must visibly communicate that it injects a simulated fault and does not control a real rig. Display the selected scenario and a short confirmation message after injection.

## 4. Mobile architecture

Mobile is a monitoring view, not a full control-room replacement.

Keep visible:

- Rig/well identity.
- Connection and data-quality state.
- Current active alarm.
- Current drilling state.
- WOB, pump pressure, pit volume, and ROP.
- Last sample age.
- Compact alarm count.

Move into tabs, drawers, or secondary screens:

- Process mimic.
- Detailed trend workspace.
- Full alarm history.
- Scenario/instructor controls.
- Operator notes.

Do not stack four large charts vertically. Use compact telemetry rows and one selected trend at a time.

## 5. Visual design system

### Color tokens

```css
--bg: #111619;
--panel: #171e22;
--panel-raised: #1d262a;
--border: #344147;
--text-primary: #e7edf0;
--text-secondary: #a5b0b5;
--normal: #6dae8b;
--advisory: #d6a84f;
--warning: #e07b39;
--critical: #d4564d;
--quality: #7f98a6;
```

Use normal green sparingly. Reserve amber, orange, and red for exceptions. Use a severity rail, icon, and text so the interface remains understandable without color vision.

### Typography

- Use the system sans-serif stack for labels and controls.
- Use a monospaced, tabular-numeral style for readings and timestamps.
- Use uppercase compact labels for equipment and state.
- Avoid oversized marketing headings.
- Approximate sizes: 11–12px metadata, 13–15px labels, 18–24px key values, 24–32px section headings.

### Geometry and spacing

- Use a 4px spacing scale.
- Use 8–16px internal panel spacing.
- Use 20–24px section spacing.
- Use 1px structural borders.
- Use a 2px alarm rail.
- Use a maximum 4px corner radius.
- Avoid large shadows; use border and tonal contrast for separation.

### Buttons and controls

- Use compact rectangular controls with clear text labels.
- Separate monitoring from simulator actions.
- Use explicit labels such as `Inject simulated kick` rather than ambiguous action language.
- Keep keyboard focus visible.
- Use confirmation text after scenario injection.
- Do not present unsupported rig controls as interactive.

## 6. Keep, change, remove, add

### Keep

- Simulated one-reading-per-second sensor feed.
- Scenario selector.
- Kick injection for demonstrations.
- Pure alarm functions.
- Alarm lifecycle states.
- Data-quality checks.
- Offline FIFO buffer.
- Pit-volume threshold and five-second change line.
- Accessible text and keyboard controls.

### Change

- Replace the hero with a compact rig/well status header.
- Replace equal metric cards with grouped telemetry lanes.
- Move simulator actions into an instructor-controls area.
- Connect alarms to chart markers and process elements.
- Add time, depth where modeled, sample-age, and quality context to trends.
- Use color primarily for abnormal conditions.

### Remove

- Marketing-style explanatory hero copy.
- Excessive empty chart space.
- Large rounded SaaS cards.
- Decorative glow and gradient treatment.
- Visual controls that imply control of real rig equipment.
- Unsupported measurements presented as real telemetry.

### Add

- Rig, well, depth, and time identity.
- A read-only pump/well/returns/pits process mimic.
- Telemetry grouping based on drilling relationships.
- A severity- and response-oriented alarm rail.
- A visible data-quality event history.
- Trend selection, time context, and data gaps.
- Explicit simulator mode labeling.

## 7. Data-model guardrails for a later implementation

The redesign should not add visual fields without adding a clear simulator source.

Existing fields that can be used immediately:

- `weightOnBit`
- `pumpPressure`
- `mudPitVolume`
- `rateOfPenetration`
- `timestamp`
- scenario state
- alarm lifecycle state
- quality issues
- online/offline/buffer state

Future fields may be added only if they are modeled and tested:

- `depthFt`
- `rotaryRpm`
- `torqueKftLb`
- `flowInGpm`
- `flowOutGpm`

Until those fields exist, the UI must not display invented RPM, torque, depth, or flow values as if they were measured.

## 8. Implementation handoff

Recommended build order:

1. Replace the hero with the persistent operations header.
2. Introduce the industrial design tokens and remove SaaS card styling.
3. Build the read-only process mimic from existing data.
4. Recompose the four measurements into grouped telemetry lanes.
5. Move the scenario selector and kick action into simulator/instructor controls.
6. Expand alarm/event presentation without moving detector logic into the UI.
7. Add grouped trends, shared axes, thresholds, alarm markers, stale states, and data gaps.
8. Add mobile navigation and compact telemetry rows.
9. Verify keyboard access, screen-reader alarm announcements, missing-data rendering, and responsive behavior.

## Acceptance criteria

- The dashboard reads like an operator console within five seconds.
- Rig, well, state, current values, data age, and active alarms are visible without scrolling on desktop.
- A kick is visible in both the pit-volume trend and the process context.
- Simulator fault injection is clearly distinct from real equipment control.
- Alarm status is understandable through text and icons, not color alone.
- Missing and stale readings are visually distinct from zero values.
- No unsupported telemetry is displayed as real.
- The responsive layout preserves alarm and data-quality visibility on mobile.
- The README continues to identify RigWatch as a simulated learning project with no real Pason data or products.
