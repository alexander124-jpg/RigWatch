import { describe, expect, it } from 'vitest';
import { checkReadingQuality } from './quality';
import type { SensorReading } from './types';

const valid: SensorReading = { timestamp: 1, weightOnBit: 20, pumpPressure: 2_500, mudPitVolume: 1_100, rateOfPenetration: 30 };

describe('checkReadingQuality', () => {
  it('accepts a normal reading', () => expect(checkReadingQuality(valid)).toEqual([]));

  it('flags missing and out-of-range values', () => {
    const issues = checkReadingQuality({ ...valid, timestamp: Number.NaN, pumpPressure: 9_000, rateOfPenetration: Number.NaN });
    expect(issues.map(({ field }) => field)).toEqual(['timestamp', 'pumpPressure', 'rateOfPenetration']);
  });
});
