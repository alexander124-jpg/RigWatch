import type { SensorReading } from './types';

type ChartProps = {
  readings: SensorReading[];
  field: keyof Omit<SensorReading, 'timestamp'>;
  color: string;
  min: number;
  max: number;
  unit: string;
};

export function SensorChart({ readings, field, color, min, max, unit }: ChartProps) {
  const width = 640;
  const height = 190;
  const points = readings.map((reading, index) => {
    const x = readings.length <= 1 ? width / 2 : (index / (readings.length - 1)) * width;
    const y = height - ((reading[field] - min) / (max - min)) * height;
    return `${x.toFixed(1)},${Math.min(height, Math.max(0, y)).toFixed(1)}`;
  });

  const latest = readings.at(-1)?.[field];

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${field} history`}>
        <line x1="0" y1={height / 2} x2={width} y2={height / 2} className="chart-grid" />
        <line x1="0" y1="0" x2={width} y2="0" className="chart-grid" />
        {points.length > 1 && <polyline points={points.join(' ')} fill="none" stroke={color} strokeWidth="3" />}
        {points.length > 0 && <circle cx={points.at(-1)?.split(',')[0]} cy={points.at(-1)?.split(',')[1]} r="4" fill={color} />}
      </svg>
      <div className="chart-scale">
        <span>{max.toLocaleString()} {unit}</span>
        <span>{min.toLocaleString()} {unit}</span>
      </div>
      <span className="chart-current">{latest === undefined ? '—' : latest.toFixed(field === 'pumpPressure' || field === 'mudPitVolume' ? 0 : 1)} {unit}</span>
    </div>
  );
}
