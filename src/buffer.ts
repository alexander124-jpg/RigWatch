import type { SensorReading } from './types';

// A tiny FIFO queue. It does not know about React or the network.
export class ReadingBuffer {
  private readings: SensorReading[] = [];

  add(reading: SensorReading) {
    this.readings.push(reading);
  }

  flush(): SensorReading[] {
    const flushed = [...this.readings];
    this.readings = [];
    return flushed;
  }

  get size() {
    return this.readings.length;
  }
}
