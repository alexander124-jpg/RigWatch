export type SensorName = 'weightOnBit' | 'pumpPressure' | 'mudPitVolume' | 'rateOfPenetration';

export type Scenario = 'normal' | 'kick' | 'lostCirculation' | 'pressureLoss' | 'sensorDropout';
export type AlarmStatus = 'active' | 'acknowledged' | 'cleared';

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
  id: string;
  timestamp: number;
  message: string;
  status: AlarmStatus;
  acknowledgedAt?: number;
  clearedAt?: number;
};
