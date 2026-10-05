import { describe, expect, it } from 'vitest';
import { canStartKickAlarm, detectKickAlarm, transitionAlarm } from './alarm';
import type { Alarm, SensorReading } from './types';

const reading = (timestamp: number, mudPitVolume: number): SensorReading => ({
  timestamp,
  mudPitVolume,
  weightOnBit: 20,
  pumpPressure: 2_500,
  rateOfPenetration: 30,
});

const options = { increaseThreshold: 50, windowSeconds: 5, cooldownSeconds: 15 };

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

  it('allows a reading exactly 5 seconds later to be evaluated', () => {
    expect(detectKickAlarm([reading(1_000, 1_100), reading(6_000, 1_151)], options)).toBe(true);
  });

  it('blocks a new kick alarm during the cooldown', () => {
    expect(canStartKickAlarm([reading(10_000, 1_100), reading(15_000, 1_151)], options, 5_000)).toBe(false);
  });

  it('allows a new kick alarm when the cooldown has elapsed', () => {
    expect(canStartKickAlarm([reading(20_000, 1_100), reading(25_000, 1_151)], options, 10_000)).toBe(true);
  });

  it('moves an alarm through acknowledged and cleared states', () => {
    const alarm: Alarm = { id: 'kick-1', timestamp: 1_000, message: 'Kick detected', status: 'active' };
    const acknowledged = transitionAlarm(alarm, { type: 'acknowledge', timestamp: 2_000 });
    const cleared = transitionAlarm(acknowledged, { type: 'clear', timestamp: 8_000 });

    expect(acknowledged).toMatchObject({ status: 'acknowledged', acknowledgedAt: 2_000 });
    expect(cleared).toMatchObject({ status: 'cleared', clearedAt: 8_000 });
  });
});
