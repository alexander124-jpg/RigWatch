import { describe, expect, it } from 'vitest';
import { ReadingBuffer } from './buffer';
import type { SensorReading } from './types';

const sample = (timestamp: number): SensorReading => ({ timestamp, weightOnBit: 20, pumpPressure: 2_500, mudPitVolume: 1_100, rateOfPenetration: 30 });

describe('ReadingBuffer', () => {
  it('flushes readings in arrival order and clears the queue', () => {
    const buffer = new ReadingBuffer();
    buffer.add(sample(1));
    buffer.add(sample(2));
    expect(buffer.size).toBe(2);
    expect(buffer.flush().map(({ timestamp }) => timestamp)).toEqual([1, 2]);
    expect(buffer.size).toBe(0);
  });
});
