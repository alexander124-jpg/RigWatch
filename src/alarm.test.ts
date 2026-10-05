import { describe, expect, it } from 'vitest';
import { detectKickAlarm } from './alarm';
import type { SensorReading } from './types';

const reading = (timestamp: number, mudPitVolume: number): SensorReading => ({
  timestamp,
  mudPitVolume,
  weightOnBit: 20,
  pumpPressure: 2_500,
  rateOfPenetration: 30,
});

const options = { increaseThreshold: 50, windowSeconds: 5 };

describe('detectKickAlarm', () => {
  it('does not alarm for normal pit-volume movement', () => {
    expect(detectKickAlarm([reading(0, 1_100), reading(5_000, 1_130)], options)).toBe(false);
  });

  it('does not alarm when the increase is exactly on the threshold', () => {
    expect(detectKickAlarm([reading(0, 1_100), reading(5_000, 1_150)], options)).toBe(false);
  });

  it('alarms when pit volume rises beyond the threshold in the time window', () => {
    expect(detectKickAlarm([reading(0, 1_100), reading(5_000, 1_151)], options)).toBe(true);
  });

  it('waits until a complete time window is available', () => {
    expect(detectKickAlarm([reading(0, 1_100), reading(4_999, 1_300)], options)).toBe(false);
  });
});
