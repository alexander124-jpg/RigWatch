import { getPitVolumeChange } from './alarm';
import type { Alarm, SensorReading } from './types';

type ChartProps = {
  readings: SensorReading[];
  field: keyof Omit<SensorReading, 'timestamp'>;
  color: string;
  min: number;
  max: number;
  unit: string;
};

type Point = { x: number; y: number };

const WIDTH = 640;
const HEIGHT = 190;

function lineSegments(values: Array<number | null>, yForValue: (value: number) => number): string[][] {
  const segments: string[][] = [];
  let current: string[] = [];

  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) {
      if (current.length > 1) segments.push(current);
      current = [];
      return;
    }

    const x = values.length <= 1 ? WIDTH / 2 : (index / (values.length - 1)) * WIDTH;
    const y = Math.min(HEIGHT, Math.max(0, yForValue(value)));
    current.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  });

  if (current.length > 1) segments.push(current);
  return segments;
}

function mapValue(value: number, min: number, max: number) {
  return HEIGHT - ((value - min) / (max - min)) * HEIGHT;
}

function latestFiniteValue(readings: SensorReading[], field: keyof Omit<SensorReading, 'timestamp'>) {
  const value = readings.at(-1)?.[field];
  return value !== undefined && Number.isFinite(value) ? value : null;
}

export function SensorChart({ readings, field, color, min, max, unit }: ChartProps) {
  const values = readings.map((reading) => {
    const value = reading[field];
    return Number.isFinite(value) ? value : null;
  });
  const latest = latestFiniteValue(readings, field);
  const segments = lineSegments(values, (value) => mapValue(value, min, max));

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={`${field} history`}>
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} className="chart-grid" />
        <line x1="0" y1="0" x2={WIDTH} y2="0" className="chart-grid" />
        {segments.map((points, index) => <polyline key={index} points={points.join(' ')} fill="none" stroke={color} strokeWidth="3" />)}
      </svg>
      <div className="chart-scale"><span>{max.toLocaleString()} {unit}</span><span>{min.toLocaleString()} {unit}</span></div>
      <span className="chart-current">{latest === null ? `missing ${unit}` : `${latest.toFixed(field === 'pumpPressure' || field === 'mudPitVolume' ? 0 : 1)} ${unit}`}</span>
    </div>
  );
}

type PitVolumeChartProps = {
  readings: SensorReading[];
  alarms: Alarm[];
  threshold: number;
  windowSeconds: number;
  min: number;
  max: number;
};

export function PitVolumeChart({ readings, alarms, threshold, windowSeconds, min, max }: PitVolumeChartProps) {
  const changes = readings.map((_, index) => getPitVolumeChange(readings.slice(0, index + 1), windowSeconds));
  const volumeValues = readings.map((reading) => Number.isFinite(reading.mudPitVolume) ? reading.mudPitVolume : null);
  const volumeSegments = lineSegments(volumeValues, (value) => mapValue(value, min, max));
  const changeSegments = lineSegments(changes, (value) => mapValue(value, -120, 120));
  const latestVolume = latestFiniteValue(readings, 'mudPitVolume');
  const latestChange = changes.at(-1);
  const firstTimestamp = readings.at(0)?.timestamp ?? 0;
  const lastTimestamp = readings.at(-1)?.timestamp ?? firstTimestamp;
  const xForTimestamp = (timestamp: number) => {
    if (lastTimestamp === firstTimestamp) return WIDTH / 2;
    return Math.min(WIDTH, Math.max(0, ((timestamp - firstTimestamp) / (lastTimestamp - firstTimestamp)) * WIDTH));
  };
  const thresholdY = mapValue(threshold, -120, 120);

  return (
    <div className="chart-wrap pit-chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="mud pit volume history with five-second change line and alarm markers">
        <line x1="0" y1={HEIGHT / 2} x2={WIDTH} y2={HEIGHT / 2} className="chart-grid" />
        <line x1="0" y1="0" x2={WIDTH} y2="0" className="chart-grid" />
        {volumeSegments.map((points, index) => <polyline key={`volume-${index}`} points={points.join(' ')} fill="none" stroke="#ffbd69" strokeWidth="3" />)}
        {changeSegments.map((points, index) => <polyline key={`change-${index}`} points={points.join(' ')} fill="none" stroke="#ff8d74" strokeWidth="2" strokeDasharray="7 4" />)}
        <line x1="0" y1={thresholdY} x2={WIDTH} y2={thresholdY} className="chart-threshold" />
        {alarms.map((alarm) => {
          const x = xForTimestamp(alarm.timestamp);
          return <g key={alarm.id}><line x1={x} y1="0" x2={x} y2={HEIGHT} className="alarm-marker" /><text x={Math.min(WIDTH - 12, x + 4)} y="14" className="alarm-marker-label">!</text><title>{alarm.message} · {alarm.status}</title></g>;
        })}
      </svg>
      <div className="chart-scale chart-scale-left"><span>{max.toLocaleString()} bbl</span><span>{min.toLocaleString()} bbl</span></div>
      <div className="chart-scale chart-scale-right"><span>+120 Δ5s</span><span>+50 threshold</span><span>-120 Δ5s</span></div>
      <div className="chart-current">{latestVolume === null ? 'missing bbl' : `${latestVolume.toFixed(0)} bbl`} · Δ5s {latestChange === null || latestChange === undefined ? '—' : `${latestChange >= 0 ? '+' : ''}${latestChange.toFixed(0)} bbl`}</div>
      <div className="chart-legend"><span><i className="legend-volume" />pit volume</span><span><i className="legend-change" />change over {windowSeconds}s</span><span><i className="legend-alarm" />alarm event</span></div>
    </div>
  );
}
