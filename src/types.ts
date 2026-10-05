export type SensorName = 'weightOnBit' | 'pumpPressure' | 'mudPitVolume' | 'rateOfPenetration';

export type SensorReading = {
  timestamp: number;
  weightOnBit: number;
  pumpPressure: number;
  mudPitVolume: number;
  rateOfPenetration: number;
};

export type QualityIssue = {
  field: SensorName | 'timestamp';
  message: string;
};

export type Alarm = {
  timestamp: number;
  message: string;
};
