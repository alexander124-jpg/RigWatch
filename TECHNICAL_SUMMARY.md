# RigWatch technical summary

RigWatch is a small React + TypeScript + Vite + Vitest project that simulates a drilling rig telemetry feed. It uses fake data for learning and interviews. It is not a Pason product and does not use real Pason data.

## The one-minute explanation

Every second, `RigSimulator.read()` creates a typed sensor reading. React stores the recent readings and renders them as SVG charts. A pure function compares the newest mud-pit volume with the oldest value at least five seconds earlier. If the increase is strictly greater than 50 bbl, RigWatch starts a kick alarm.

The alarm has a small lifecycle: it starts active, can be acknowledged by the operator, and becomes cleared when the volume condition ends. A 15-second cooldown and a false-to-true transition prevent one sustained kick from creating repeated history entries.

## Main data types

`src/types.ts` defines the shared vocabulary:

```ts
type SensorReading = {
  timestamp: number;
  weightOnBit: number;
  pumpPressure: number;
  mudPitVolume: number;
  rateOfPenetration: number;
};
```

Other important types are:

- `Scenario`: `normal`, `kick`, `lostCirculation`, `pressureLoss`, or `sensorDropout`.
- `AlarmStatus`: `active`, `acknowledged`, or `cleared`.
- `Alarm`: an id, timestamp, message, status, and optional lifecycle timestamps.
- `QualityIssue`: the affected field and a human-readable reason.

The sensor values are numbers because the simulator is deliberately simple. A dropout is represented by `Number.NaN`; the quality checker treats that as missing and the charts render it as a gap/missing value.

## File responsibilities

### `src/simulator.ts`

`RigSimulator` owns sensor generation. It keeps one internal state object and applies a bounded random walk:

- Weight on bit changes by up to 2 klbf per reading.
- Pump pressure changes by up to 180 psi per reading.
- Mud pit volume changes by up to 3 bbl per reading in normal mode.
- Rate of penetration changes by up to 4 ft/hr per reading.

`clamp()` keeps values within the simulator's realistic ranges.

`setScenario()` starts a five-reading scenario. The scenario effects are:

| Scenario | Effect |
| --- | --- |
| Normal | All sensors use their normal random walks. |
| Kick | Mud pit volume increases by 24 bbl per reading. |
| Lost circulation | Mud pit volume decreases by 18 bbl per reading. |
| Pressure loss | Pump pressure decreases by 350 psi per reading. |
| Sensor dropout | Mud pit volume is emitted as `NaN`. |

After five readings the simulator returns to normal behavior. The internal value remains valid during dropout so the sensor can recover cleanly.

### `src/App.tsx`

`App` is the orchestration layer. It owns React state for:

- Online/offline display mode.
- Selected scenario.
- Recent readings, capped at 60.
- Alarm history, capped at 5 visible events.
- Last data-quality issue count.
- Current offline buffer count.

It uses `useRef()` for objects that should persist without causing renders:

- The simulator instance.
- The FIFO buffer.
- The current scenario timeout.
- The last alarm timestamp for cooldown checks.
- Whether the detector was already active on the previous reading.

An interval calls `simulator.read()` once per second. Online readings go directly through `addReading()`. Offline readings go into the buffer instead.

### `src/alarm.ts`

This file contains pure logic. It does not import React or touch the DOM.

Important functions:

- `getPitVolumeChange(readings, windowSeconds)` returns the latest available volume change or `null` if a complete valid window is unavailable.
- `detectKickAlarm(readings, options)` returns true only when the change is strictly greater than the configured threshold.
- `isAlarmCooldownElapsed(current, lastAlarm, cooldown)` checks the time separation between alarm starts.
- `canStartKickAlarm(...)` combines detection and cooldown.
- `transitionAlarm(alarm, action)` applies acknowledgement and clearing transitions.

The default alarm configuration is:

```ts
{
  increaseThreshold: 50,
  windowSeconds: 5,
  cooldownSeconds: 15,
}
```

### `src/chart.tsx`

The charts are hand-built SVG rather than using a chart dependency. That keeps the project small and makes the rendering explainable.

`SensorChart` renders the three ordinary sensor histories. It splits lines when a value is missing so `NaN` does not create invalid SVG coordinates.

`PitVolumeChart` adds domain-specific context:

- Left axis: absolute pit volume.
- Right axis: five-second change, from -120 to +120 bbl.
- Dashed line: +50 bbl alarm threshold.
- Dashed red line: calculated five-second change.
- Vertical markers: alarm event timestamps.
- Text legend and accessible SVG label.

The chart calls the same `getPitVolumeChange()` function as the alarm detector. That means the visual explanation and the actual alarm use identical window logic.

### `src/quality.ts`

`checkReadingQuality()` checks every reading for:

- A finite timestamp.
- Finite sensor values.
- Values inside broad configured ranges.

It currently flags missing and out-of-range readings. The dropout scenario demonstrates the missing-value path.

### `src/buffer.ts`

`ReadingBuffer` is a small FIFO queue:

```text
add(reading)  -> append to the end
flush()       -> return a copy from oldest to newest, then clear the queue
size          -> current number of buffered readings
```

The buffer knows nothing about React or networking. That makes it easy to test and explain.

## Alarm math and lifecycle

Suppose the newest reading is at `12:00:10` and the oldest eligible reading is at `12:00:05`:

```text
pit change = newest pit volume - oldest pit volume
```

Examples:

- `1,150 - 1,100 = 50`: no alarm.
- `1,151 - 1,100 = 51`: alarm.
- A timestamp difference of exactly 5,000 ms: eligible.
- A timestamp difference of 4,999 ms: not eligible.

The UI has two duplicate protections:

1. `alarmWasActive` detects the detector's false-to-true transition. While the condition remains true, it does not create another event.
2. `lastAlarmTimestamp` plus the 15-second cooldown blocks a separate rapid event after the first condition has cleared.

Lifecycle example:

```text
detector false -> true       create active alarm
operator clicks Acknowledge  active -> acknowledged
detector true -> false       acknowledged -> cleared
```

If the detector clears before acknowledgement, the direct transition is:

```text
active -> cleared
```

Cleared alarms remain in history and stay visible as chart markers.

## Offline behavior

When the user clicks `Go offline`:

1. The simulator continues producing readings.
2. The dashboard stops adding them to visible history.
3. New readings are appended to `ReadingBuffer`.
4. The UI shows the buffer size.

When the user clicks `Reconnect`:

1. `flush()` returns readings in insertion order.
2. Each reading is passed through the same `addReading()` path as live data.
3. The queue is empty.

This is an in-memory demo buffer. It is not persistent across page refreshes and has no network acknowledgements or deduplication.

## Tests and CI

The test files cover:

- Alarm normal case.
- Exactly 50 bbl versus 51 bbl.
- Exactly 5 seconds versus an incomplete window.
- Cooldown blocking and cooldown expiration.
- Alarm acknowledgement and clearing.
- FIFO flush order and queue clearing.
- Valid and invalid data quality.

Run locally:

```bash
npm run lint   # TypeScript type-check
npm test       # Vitest
npm run build  # TypeScript build plus Vite production build
```

GitHub Actions runs `npm ci`, `npm run lint`, and `npm test` on pushes and pull requests.

## Demo script

1. Start in Normal drilling and point out the four live values.
2. Choose Kick or press Inject kick event.
3. Explain that only pit volume changes directly; the other sensors continue their normal random walks.
4. Point to the red five-second change line crossing the +50 threshold.
5. Show one alarm event, acknowledge it if it is still active, and explain that it clears after the condition ends.
6. Choose Lost circulation to show volume moving in the opposite direction.
7. Choose Pressure loss to show pump pressure changing.
8. Choose Sensor dropout to show the data-quality warning and missing pit value.
9. Optionally go offline, wait for the buffer count to increase, and reconnect to explain FIFO replay.

## Limitations and honest production answer

This is a learning simulator, not an operational monitoring system. A production version would need real event timing, persisted buffering, sequence numbers, acknowledgements, deduplication, server-side alarm evaluation, sensor-specific metadata, stale/flat-line detection, and a carefully reviewed alarm policy.

The most important boundary to state in an interview is: RigWatch demonstrates telemetry concepts with fake data; it does not represent real Pason data, APIs, or products.

## Interview questions and answers

### Why is exactly 50 bbl not an alarm?

The requirement is “more than 50,” so the code uses `change > 50`. Exactly 50 is a deliberate boundary test. Exactly five seconds is allowed because the time comparison uses `>=`.

### How does the cooldown prevent duplicate alarms?

The false-to-true transition prevents repeated events during one sustained condition. The 15-second timestamp cooldown prevents a separate kick from immediately creating another event after the first one clears.

### What happens when the condition falls below the threshold?

The detector becomes false. The UI finds the latest non-cleared alarm and applies the pure `clear` transition. The alarm remains in history but the system status returns to nominal.

### Why keep detection outside React?

Pure functions are deterministic, easy to unit test, and reusable. They do not depend on timers, component renders, browser state, or user interaction.

### Why use `NaN` for sensor dropout?

It is a simple typed representation of a numeric sensor that failed to produce a usable value. `checkReadingQuality()` catches it with `Number.isFinite()`, and the chart intentionally renders a gap instead of plotting invalid coordinates.

### How would you make the offline buffer production-ready?

Persist it in IndexedDB, add sequence numbers, cap the queue, retry delivery, acknowledge successfully delivered readings, and deduplicate replayed records.

### Why use SVG instead of a chart library?

The project is intentionally small and interview-readable. SVG is enough for four short rolling lines, threshold overlays, and event markers without adding another dependency or abstraction to explain.
