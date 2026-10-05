# RigWatch

RigWatch is a small simulated project built to understand the shape of drilling telemetry and the domain language around it. It does **not** use real Pason data, products, or integrations. Codex helped scaffold the project; the code is intentionally compact enough to read through and explain in an interview.

## Run it

```bash
npm install
npm run dev
```

Checks:

```bash
npm run lint   # TypeScript type-check
npm test       # Vitest unit tests
npm run build  # production build
```

## Architecture

- `src/simulator.ts` owns the one-reading-per-second random walk. `injectKick()` adds 24 bbl per second for five seconds so the alarm is easy to observe.
- `src/App.tsx` owns the small amount of UI state. It keeps the most recent 60 readings and renders four SVG line charts from that history.
- `src/alarm.ts` is a pure function. It receives readings and explicit threshold settings, so it has no timer, DOM, or React dependency.
- `src/quality.ts` checks finite values and deliberately broad operating ranges. In a real system these limits would come from sensor metadata and well context.
- `src/buffer.ts` is a FIFO queue. While offline, generated readings go into the queue. On reconnect, `flush()` returns a copy in insertion order and clears the queue.

## Alarm logic

The demo uses `increaseThreshold: 50` bbl and `windowSeconds: 5`. The detector takes the newest reading, finds the oldest reading at least five seconds earlier, and calculates:

```text
newest.mudPitVolume - oldest.mudPitVolume > 50
```

The comparison is intentionally strict: exactly +50 bbl is the borderline no-alarm case. The unit tests cover normal movement, the exact threshold, a kick, and an incomplete time window.

## What I would improve

For a production-like version I would use a real event/time source, persisted offline storage, sequence numbers and acknowledgements for reconnects, deduplication, server-side alarm evaluation, richer sensor quality metadata, and an accessible charting layer with annotations. I would also separate display history from the data-delivery queue so replaying offline data could not be confused with current time.

## Deliberate break-and-repair check

I verified the tests by temporarily changing the detector's `>` comparison to `>=`; the borderline test failed as expected. I restored the strict comparison and reran the suite successfully. This is a simulated learning project, not a claim of operational rig monitoring.
