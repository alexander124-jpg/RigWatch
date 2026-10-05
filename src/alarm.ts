import type { SensorReading } from './types';

export type KickAlarmOptions = {
  increaseThreshold: number;
  windowSeconds: number;
};

/**
 * Looks at the oldest and newest pit readings in a time window.
 * The comparison is strictly greater than the threshold, so an exact
 * threshold is the documented borderline/no-alarm case.
 */
export function detectKickAlarm(
  readings: SensorReading[],
  { increaseThreshold, windowSeconds }: KickAlarmOptions,
): boolean {
  if (readings.length < 2) return false;

  const newest = readings[readings.length - 1];
  const oldest = readings.find((reading) => newest.timestamp - reading.timestamp >= windowSeconds * 1_000);
  if (!oldest) return false;

  return newest.mudPitVolume - oldest.mudPitVolume > increaseThreshold;
}
