import { useEffect, useMemo, useRef, useState } from 'react';
import { detectKickAlarm } from './alarm';
import { ReadingBuffer } from './buffer';
import { SensorChart } from './chart';
import { checkReadingQuality } from './quality';
import { RigSimulator } from './simulator';
import type { Alarm, SensorReading } from './types';
import './styles.css';

const HISTORY_LIMIT = 60;
const ALARM_OPTIONS = { increaseThreshold: 50, windowSeconds: 5 };

const cards = [
  { field: 'weightOnBit', label: 'Weight on bit', unit: 'klbf', color: '#65d5b1', min: 0, max: 60 },
  { field: 'pumpPressure', label: 'Pump pressure', unit: 'psi', color: '#6cb5ff', min: 0, max: 6_000 },
  { field: 'mudPitVolume', label: 'Mud pit volume', unit: 'bbl', color: '#ffbd69', min: 800, max: 2_000 },
  { field: 'rateOfPenetration', label: 'Rate of penetration', unit: 'ft/hr', color: '#c09cff', min: 0, max: 120 },
] as const;

function App() {
  const simulator = useRef(new RigSimulator());
  const buffer = useRef(new ReadingBuffer());
  const [online, setOnline] = useState(true);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [lastQualityIssueCount, setLastQualityIssueCount] = useState(0);
  const [bufferedCount, setBufferedCount] = useState(0);
  const alarmWasActive = useRef(false);

  const addReading = (reading: SensorReading) => {
    const qualityIssues = checkReadingQuality(reading);
    setLastQualityIssueCount(qualityIssues.length);
    setReadings((current) => [...current, reading].slice(-HISTORY_LIMIT));
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      const reading = simulator.current.read();
      if (online) {
        addReading(reading);
      } else {
        buffer.current.add(reading);
        setBufferedCount(buffer.current.size);
      }
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [online]);

  const toggleOnline = () => {
    if (!online) {
      // flush() preserves insertion order; each buffered reading is replayed into the dashboard.
      buffer.current.flush().forEach(addReading);
      setBufferedCount(buffer.current.size);
    }
    setOnline((current) => !current);
  };

  const injectKick = () => simulator.current.injectKick();
  const recentReadings = readings.slice(-ALARM_OPTIONS.windowSeconds - 1);
  const alarmActive = detectKickAlarm(recentReadings, ALARM_OPTIONS);
  const current = readings.at(-1);
  const timeLabel = current ? new Date(current.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Waiting for first reading';
  const statusText = online ? 'Live feed' : 'Offline · collecting locally';
  const qualityText = lastQualityIssueCount === 0 ? 'Data quality nominal' : `${lastQualityIssueCount} quality issue(s)`;

  useEffect(() => {
    if (alarmActive && !alarmWasActive.current && current) {
      setAlarms((existing) => [...existing, { timestamp: current.timestamp, message: 'Pit volume rose more than 50 bbl in 5 seconds' }].slice(-5));
    }
    alarmWasActive.current = alarmActive;
  }, [alarmActive, current]);

  const chartReadings = useMemo(() => readings.slice(-30), [readings]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">RW</span><div><p className="eyebrow">SIMULATED FIELD FEED</p><h1>RigWatch</h1></div></div>
        <div className="top-actions"><span className={`connection-dot ${online ? 'online' : 'offline'}`} /> <span>{statusText}</span><button className="button secondary" onClick={toggleOnline}>{online ? 'Go offline' : 'Reconnect'}</button></div>
      </header>

      <section className="hero-row">
        <div><p className="eyebrow">NORTH STAR · RIG 07</p><h2>Drilling operations overview</h2><p className="muted">A deliberately small simulation for learning the shape of rig telemetry.</p></div>
        <button className="button kick-button" onClick={injectKick}>Inject kick event <span>↗</span></button>
      </section>

      <section className="status-strip">
        <span className={alarmActive ? 'status-badge alarm' : 'status-badge'}><span className="status-icon">{alarmActive ? '!' : '✓'}</span>{alarmActive ? 'KICK ALARM ACTIVE' : 'SYSTEM NOMINAL'}</span>
        <span className="status-detail">{qualityText}</span><span className="status-detail">Last sample {timeLabel}</span><span className="status-detail">Buffer {bufferedCount} readings</span>
      </section>

      <section className="metric-grid">
        {cards.map((card) => <article className="metric-card" key={card.field}>
          <div className="metric-heading"><span>{card.label}</span><span className="metric-unit">{card.unit}</span></div>
          <SensorChart readings={chartReadings} field={card.field} color={card.color} min={card.min} max={card.max} unit={card.unit} />
        </article>)}
      </section>

      <section className="lower-grid">
        <article className="panel alarm-panel"><div className="panel-heading"><div><p className="eyebrow">EVENT LOG</p><h3>Alarm history</h3></div><span className="counter">{alarms.length}</span></div>{alarms.length === 0 ? <p className="empty-state">No alarms in this session. Use “Inject kick event” to test the detector.</p> : <div className="alarm-list">{alarms.slice().reverse().map((alarm) => <div className="alarm-row" key={alarm.timestamp}><span className="alarm-dot" /><div><strong>{alarm.message}</strong><span>{new Date(alarm.timestamp).toLocaleTimeString()}</span></div></div>)}</div>}</article>
        <article className="panel explainer"><p className="eyebrow">OPERATOR NOTES</p><h3>How this demo behaves</h3><p>The feed emits one reading per second. The kick detector compares pit volume now with the reading at least 5 seconds ago; an increase strictly greater than 50 bbl raises the alarm.</p><p>Going offline stops display updates but keeps generating readings in a FIFO buffer. Reconnecting flushes them oldest-first.</p></article>
      </section>
      <footer>RigWatch is a simulated project built to understand drilling telemetry concepts. It uses no real Pason data or products.</footer>
    </main>
  );
}

export default App;
