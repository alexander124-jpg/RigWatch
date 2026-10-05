import type { SensorReading } from './types';

// Keeping the state in one object makes the random walk easy to explain.
type SimulatorState = Omit<SensorReading, 'timestamp'>;

const LIMITS = {
  weightOnBit: { min: 8, max: 38 },
  pumpPressure: { min: 1_200, max: 4_500 },
  mudPitVolume: { min: 1_000, max: 1_450 },
  rateOfPenetration: { min: 5, max: 65 },
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const step = (value: number, amount: number, min: number, max: number) =>
  clamp(value + (Math.random() * 2 - 1) * amount, min, max);

export class RigSimulator {
  private state: SimulatorState = {
    weightOnBit: 22,
    pumpPressure: 2_650,
    mudPitVolume: 1_180,
    rateOfPenetration: 32,
  };

  private kickSecondsRemaining = 0;

  read(timestamp = Date.now()): SensorReading {
    this.state.weightOnBit = step(this.state.weightOnBit, 2, LIMITS.weightOnBit.min, LIMITS.weightOnBit.max);
    this.state.pumpPressure = step(this.state.pumpPressure, 180, LIMITS.pumpPressure.min, LIMITS.pumpPressure.max);
    this.state.rateOfPenetration = step(
      this.state.rateOfPenetration,
      4,
      LIMITS.rateOfPenetration.min,
      LIMITS.rateOfPenetration.max,
    );

    if (this.kickSecondsRemaining > 0) {
      // A kick is deliberately obvious: extra pit volume arrives for a few seconds.
      this.state.mudPitVolume = clamp(this.state.mudPitVolume + 24, LIMITS.mudPitVolume.min, 1_650);
      this.kickSecondsRemaining -= 1;
    } else {
      this.state.mudPitVolume = step(
        this.state.mudPitVolume,
        3,
        LIMITS.mudPitVolume.min,
        LIMITS.mudPitVolume.max,
      );
    }

    return { timestamp, ...this.state };
  }

  injectKick() {
    this.kickSecondsRemaining = 5;
  }
}
