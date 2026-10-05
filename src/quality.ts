import type { QualityIssue, SensorReading } from './types';

const RANGES = {
  weightOnBit: [0, 60],
  pumpPressure: [0, 6_000],
  mudPitVolume: [800, 2_000],
  rateOfPenetration: [0, 120],
} as const;

export function checkReadingQuality(reading: SensorReading): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (!Number.isFinite(reading.timestamp)) issues.push({ field: 'timestamp', message: 'timestamp is missing' });

  for (const [field, [min, max]] of Object.entries(RANGES) as [keyof typeof RANGES, readonly [number, number]][]) {
    const value = reading[field];
    if (!Number.isFinite(value)) {
      issues.push({ field, message: `${field} is missing` });
    } else if (value < min || value > max) {
      issues.push({ field, message: `${field} is outside ${min}–${max}` });
    }
  }

  return issues;
}
