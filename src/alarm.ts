import type { Alarm, SensorReading } from './types';

export type KickAlarmOptions = {
  increaseThreshold: number;
  windowSeconds: number;
  cooldownSeconds: number;
};

export type AlarmLifecycleAction =
  | { type: 'acknowledge'; timestamp: number }
  | { type: 'clear'; timestamp: number };

/** Returns the newest pit-volume change available over the requested time window. */
export function getPitVolumeChange(readings: SensorReading[], windowSeconds: number): number | null {
  if (readings.length < 2) return null;

  const newest = readings[readings.length - 1];
  if (!Number.isFinite(newest.mudPitVolume)) return null;

  const oldest = readings.find(
    (reading) => newest.timestamp - reading.timestamp >= windowSeconds * 1_000,
  );
  if (!oldest || !Number.isFinite(oldest.mudPitVolume)) return null;

  return newest.mudPitVolume - oldest.mudPitVolume;
}

/**
 * A kick is strictly more than the threshold. Exactly +50 bbl is intentionally
 * the borderline/no-alarm case, while exactly 5 seconds is eligible.
 */
export function detectKickAlarm(
  readings: SensorReading[],
  { increaseThreshold, windowSeconds }: KickAlarmOptions,
): boolean {
  const change = getPitVolumeChange(readings, windowSeconds);
  return change !== null && change > increaseThreshold;
}

export function isAlarmCooldownElapsed(
  currentTimestamp: number,
  lastAlarmTimestamp: number | null,
  cooldownSeconds: number,
): boolean {
  return lastAlarmTimestamp === null || currentTimestamp - lastAlarmTimestamp >= cooldownSeconds * 1_000;
}

/** Combines detection and cooldown so the UI does not duplicate one event. */
export function canStartKickAlarm(
  readings: SensorReading[],
  options: KickAlarmOptions,
  lastAlarmTimestamp: number | null,
): boolean {
  const newest = readings.at(-1);
  return Boolean(
    newest &&
      detectKickAlarm(readings, options) &&
      isAlarmCooldownElapsed(newest.timestamp, lastAlarmTimestamp, options.cooldownSeconds),
  );
}

/** Pure lifecycle transition used by the UI and its tests. */
export function transitionAlarm(alarm: Alarm, action: AlarmLifecycleAction): Alarm {
  if (action.type === 'acknowledge' && alarm.status === 'active') {
    return { ...alarm, status: 'acknowledged', acknowledgedAt: action.timestamp };
  }

  if (action.type === 'clear' && alarm.status !== 'cleared') {
    return { ...alarm, status: 'cleared', clearedAt: action.timestamp };
  }

  return alarm;
}
