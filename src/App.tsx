import { useEffect, useMemo, useRef, useState } from 'react';
import { canStartKickAlarm, detectKickAlarm, transitionAlarm } from './alarm';
import { ReadingBuffer } from './buffer';
import { PitVolumeChart, SensorChart } from './chart';
import { checkReadingQuality } from './quality';
import { RigSimulator } from './simulator';
import type { Alarm, Scenario, SensorReading } from './types';
import './styles.css';

const HISTORY_LIMIT = 60;
const ALARM_OPTIONS = { increaseThreshold: 50, windowSeconds: 5, cooldownSeconds: 15 };

const cards = [
  { field: 'weightOnBit', label: 'Weight on bit', unit: 'klbf', color: '#65d5b1', min: 0, max: 60 },
  { field: 'pumpPressure', label: 'Pump pressure', unit: 'psi', color: '#6cb5ff', min: 0, max: 6_000 },
  { field: 'mudPitVolume', label: 'Mud pit volume', unit: 'bbl', color: '#ffbd69', min: 800, max: 2_000 },
  { field: 'rateOfPenetration', label: 'Rate of penetration', unit: 'ft/hr', color: '#c09cff', min: 0, max: 120 },
] as const;

const scenarios: Array<{ value: Scenario; label: string }> = [
  { value: 'normal', label: 'Normal drilling' },
  { value: 'kick', label: 'Kick · pit volume rises' },
  { value: 'lostCirculation', label: 'Lost circulation · pit volume drops' },
  { value: 'pressureLoss', label: 'Pump pressure loss' },
  { value: 'sensorDropout', label: 'Sensor dropout · mud pit missing' },
];

const scenarioLabel = (scenario: Scenario) => scenarios.find((option) => option.value === scenario)?.label ?? scenario;

function App() {
  const simulator = useRef(new RigSimulator());
  const buffer = useRef(new ReadingBuffer());
  const scenarioTimer = useRef<number | null>(null);
  const lastAlarmTimestamp = useRef<number | null>(null);
  const alarmWasActive = useRef(false);
  const [online, setOnline] = useState(true);
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [lastQualityIssueCount, setLastQualityIssueCount] = useState(0);
  const [bufferedCount, setBufferedCount] = useState(0);

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

  useEffect(() => () => {
    if (scenarioTimer.current !== null) window.clearTimeout(scenarioTimer.current);
  }, []);

  const startScenario = (nextScenario: Scenario) => {
    if (scenarioTimer.current !== null) window.clearTimeout(scenarioTimer.current);
    simulator.current.setScenario(nextScenario);
    setScenario(nextScenario);

    if (nextScenario !== 'normal') {
      scenarioTimer.current = window.setTimeout(() => setScenario('normal'), 5_500);
    }
  };

  const toggleOnline = () => {
    if (!online) {
      // flush() preserves insertion order; each buffered reading is replayed into the dashboard.
      buffer.current.flush().forEach(addReading);
      setBufferedCount(buffer.current.size);
    }
    setOnline((current) => !current);
  };

  const current = readings.at(-1);
  const recentReadings = readings.slice(-ALARM_OPTIONS.windowSeconds - 1);
  const detectorActive = detectKickAlarm(recentReadings, ALARM_OPTIONS);
  const timeLabel = current
    ? new Date(current.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : 'Waiting for first reading';
  const statusText = online ? 'Live feed' : 'Offline · collecting locally';
  const qualityText = lastQualityIssueCount === 0 ? 'Data quality nominal' : `${lastQualityIssueCount} quality issue(s)`;
  const currentAlarm = alarms.find((alarm) => alarm.status === 'active') ?? alarms.find((alarm) => alarm.status === 'acknowledged');

  useEffect(() => {
    if (!current) return;

    if (detectorActive && !alarmWasActive.current) {
      if (canStartKickAlarm(recentReadings, ALARM_OPTIONS, lastAlarmTimestamp.current)) {
        const alarm: Alarm = {
          id: `kick-${current.timestamp}`,
          timestamp: current.timestamp,
          message: 'Pit volume rose more than 50 bbl in 5 seconds',
          status: 'active',
        };
        setAlarms((existing) => [...existing, alarm].slice(-5));
        lastAlarmTimestamp.current = current.timestamp;
      }
    } else if (!detectorActive && alarmWasActive.current) {
      setAlarms((existing) => {
        const openAlarm = [...existing].reverse().find((alarm) => alarm.status !== 'cleared');
        return openAlarm
          ? existing.map((alarm) => alarm.id === openAlarm.id ? transitionAlarm(alarm, { type: 'clear', timestamp: current.timestamp }) : alarm)
          : existing;
      });
    }

    alarmWasActive.current = detectorActive;
  }, [current, detectorActive, recentReadings]);

  const acknowledgeAlarm = (id: string) => {
    const timestamp = current?.timestamp ?? Date.now();
    setAlarms((existing) => existing.map((alarm) => alarm.id === id ? transitionAlarm(alarm, { type: 'acknowledge', timestamp }) : alarm));
  };

  const chartReadings = useMemo(() => readings.slice(-30), [readings]);
  const injectKick = () => startScenario('kick');

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">RW</span><div><p className="eyebrow">SIMULATED FIELD FEED</p><h1>RigWatch</h1></div></div>
        <div className="top-actions"><span className={`connection-dot ${online ? 'online' : 'offline'}`} /> <span>{statusText}</span><button className="button secondary" onClick={toggleOnline}>{online ? 'Go offline' : 'Reconnect'}</button></div>
      </header>

      <section className="hero-row">
        <div><p className="eyebrow">NORTH STAR · RIG 07</p><h2>Drilling operations overview</h2><p className="muted">A deliberately small simulation for learning the shape of rig telemetry.</p></div>
        <div className="hero-controls">
          <label className="scenario-control"><span className="eyebrow">SCENARIO</span><select value={scenario} onChange={(event) => startScenario(event.target.value as Scenario)} aria-label="Choose a rig scenario">{scenarios.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <button className="button kick-button" onClick={injectKick}>Inject kick event <span>↗</span></button>
        </div>
      </section>

      <section className="status-strip">
        <span className={currentAlarm ? 'status-badge alarm' : 'status-badge'}><span className="status-icon" aria-hidden="true">{currentAlarm ? '!' : '✓'}</span>{currentAlarm ? `KICK ALARM ${currentAlarm.status.toUpperCase()}` : 'SYSTEM NOMINAL'}</span>
        <span className="status-detail">{qualityText}</span><span className="status-detail">Scenario {scenarioLabel(scenario)}</span><span className="status-detail">Last sample {timeLabel}</span><span className="status-detail">Buffer {bufferedCount} readings</span>
      </section>

      <section className="metric-grid">
        {cards.map((card) => <article className="metric-card" key={card.field}>
          <div className="metric-heading"><span>{card.label}</span><span className="metric-unit">{card.unit}</span></div>
          {card.field === 'mudPitVolume' ? <PitVolumeChart readings={chartReadings} alarms={alarms} threshold={ALARM_OPTIONS.increaseThreshold} windowSeconds={ALARM_OPTIONS.windowSeconds} min={card.min} max={card.max} /> : <SensorChart readings={chartReadings} field={card.field} color={card.color} min={card.min} max={card.max} unit={card.unit} />}
        </article>)}
      </section>

      <section className="lower-grid">
        <article className="panel alarm-panel"><div className="panel-heading"><div><p className="eyebrow">EVENT LOG</p><h3>Alarm history</h3></div><span className="counter">{alarms.length}</span></div>{alarms.length === 0 ? <p className="empty-state">No alarms in this session. Use “Inject kick event” or choose the kick scenario.</p> : <div className="alarm-list">{alarms.slice().reverse().map((alarm) => <div className={`alarm-row alarm-${alarm.status}`} key={alarm.id}><span className="alarm-dot" aria-hidden="true">{alarm.status === 'active' ? '!' : alarm.status === 'acknowledged' ? '✓' : '·'}</span><div className="alarm-content"><strong><span aria-hidden="true">⚠</span> {alarm.message}</strong><span className="alarm-meta">{alarm.status} · {new Date(alarm.timestamp).toLocaleTimeString()}</span>{alarm.status === 'active' && <button className="button compact" onClick={() => acknowledgeAlarm(alarm.id)}>Acknowledge</button>}</div></div>)}</div>}</article>
        <article className="panel explainer"><p className="eyebrow">OPERATOR NOTES</p><h3>How this demo behaves</h3><p>The detector compares pit volume now with the reading at least 5 seconds ago. A change strictly greater than 50 bbl starts one alarm, then a 15-second cooldown prevents rapid re-triggering.</p><p>Active alarms can be acknowledged. When the pit-volume condition ends, the alarm is marked cleared. The event marker and Δ5s line make the trigger visible on the pit chart.</p><p>Choose a scenario to demonstrate a kick, lost circulation, pressure loss, or a missing sensor reading.</p></article>
      </section>
      <footer>RigWatch is a simulated project built to understand drilling telemetry concepts. It uses no real Pason data or products.</footer>
    </main>
  );
}

export default App;
