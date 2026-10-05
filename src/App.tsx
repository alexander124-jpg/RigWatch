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
const formatValue = (value: number | undefined, digits = 0) => value === undefined || !Number.isFinite(value) ? '—' : value.toFixed(digits);
const formatTime = (timestamp: number | undefined) => timestamp === undefined ? '—' : new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const alarmPriority = (status: Alarm['status']) => status === 'active' ? 'CRITICAL' : status === 'acknowledged' ? 'HIGH' : 'HISTORICAL';

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
      <header className="console-header">
        <div className="brand-lockup"><span className="brand-mark">RW</span><div><p className="eyebrow">RIGWATCH / SIMULATED EDR</p><h1>North Star / Rig 07</h1></div></div>
        <div className="header-readouts"><span><b>WELL</b> A-01</span><span><b>MODE</b> DRILLING</span><span><b>TIME</b> {formatTime(current?.timestamp)}</span></div>
        <div className="top-actions"><span className={`connection-dot ${online ? 'online' : 'offline'}`} /><span>{statusText}</span><button className="button secondary" onClick={toggleOnline}>{online ? 'Go offline' : 'Reconnect'}</button></div>
      </header>

      <section className="console-strip" aria-live="polite">
        <div className="strip-cell strip-state"><span className="eyebrow">SYSTEM STATE</span><strong className={currentAlarm ? 'state-critical' : ''}><span className="status-icon" aria-hidden="true">{currentAlarm ? '!' : '✓'}</span>{currentAlarm ? `KICK ALARM / ${currentAlarm.status.toUpperCase()}` : 'SYSTEM NOMINAL'}</strong></div>
        <div className="strip-cell"><span className="eyebrow">DATA QUALITY</span><strong>{qualityText.replace('Data quality ', '')}</strong></div>
        <div className="strip-cell"><span className="eyebrow">OPERATION</span><strong>{scenarioLabel(scenario)}</strong></div>
        <div className="strip-cell"><span className="eyebrow">LAST SAMPLE</span><strong>{formatTime(current?.timestamp)}</strong><small>1 sec cycle</small></div>
        <div className="strip-cell"><span className="eyebrow">BUFFER</span><strong>{bufferedCount} readings</strong><small>{online ? 'live delivery' : 'collecting locally'}</small></div>
      </section>

      <section className="workspace-grid">
        <article className="panel process-panel">
          <div className="panel-heading"><div><p className="eyebrow">PROCESS OVERVIEW</p><h2 className="section-title">Surface flow path</h2></div><span className="panel-context">READ-ONLY / SIMULATED</span></div>
          <div className="process-mimic" aria-label="Simulated drilling fluid flow path">
            <div className="process-node"><span className="process-index">01</span><div><strong>MUD PUMPS</strong><small>standpipe pressure</small></div><b>{formatValue(current?.pumpPressure)} <em>psi</em></b></div>
            <span className="process-arrow" aria-hidden="true">→</span>
            <div className="process-node"><span className="process-index">02</span><div><strong>WELLBORE / BIT</strong><small>downhole state</small></div><b className="process-muted">not modeled</b></div>
            <span className="process-arrow" aria-hidden="true">→</span>
            <div className="process-node"><span className="process-index">03</span><div><strong>RETURNS / PITS</strong><small>mud pit volume</small></div><b>{formatValue(current?.mudPitVolume)} <em>bbl</em></b></div>
          </div>
          <div className="process-footer"><span><b>SCENARIO</b> {scenarioLabel(scenario)}</span><span><b>DEPTH</b> not modeled</span><span><b>FLOW</b> simulated signal</span></div>
        </article>

        <aside className="panel alarm-rail" aria-live="polite">
          <div className="panel-heading"><div><p className="eyebrow">ALARM STATUS</p><h2 className="section-title">Event monitor</h2></div><span className={`counter ${currentAlarm ? 'counter-critical' : ''}`}>{alarms.filter((alarm) => alarm.status !== 'cleared').length}</span></div>
          <div className={currentAlarm ? 'alarm-rail-state rail-critical' : 'alarm-rail-state'}><span className="alarm-state-icon" aria-hidden="true">{currentAlarm ? '!' : '✓'}</span><div><strong>{currentAlarm ? 'Attention required' : 'No active alarms'}</strong><small>{currentAlarm ? currentAlarm.message : 'All monitored signals within demo limits'}</small></div></div>
          {alarms.length === 0 ? <p className="empty-state compact-empty">No events in this session.</p> : <div className="alarm-table alarm-table-compact">{alarms.slice().reverse().slice(0, 3).map((alarm) => <div className={`alarm-table-row alarm-${alarm.status}`} key={alarm.id}><span className="severity-mark" aria-hidden="true">{alarm.status === 'active' ? '!' : alarm.status === 'acknowledged' ? '✓' : '·'}</span><div><strong>PIT VOLUME</strong><small>{formatTime(alarm.timestamp)} · {alarm.status}</small></div><span className="alarm-priority">{alarmPriority(alarm.status)}</span></div>)}</div>}
        </aside>
      </section>

      <section className="telemetry-section" aria-label="Live drilling telemetry">
        <div className="section-heading"><div><p className="eyebrow">LIVE TELEMETRY</p><h2 className="section-title">Drilling parameters</h2></div><span className="panel-context">1 SEC SAMPLE / LAST 30 POINTS</span></div>
        <div className="metric-grid">
          {cards.map((card) => <article className="metric-card" key={card.field}>
          <div className="metric-heading"><div><span className="metric-tag">{card.field === 'mudPitVolume' ? 'MUD SYSTEM' : 'DRILLING'}</span><span className="metric-label">{card.label}</span></div><span className="metric-unit">{card.unit}</span></div>
          {card.field === 'mudPitVolume' ? <PitVolumeChart readings={chartReadings} alarms={alarms} threshold={ALARM_OPTIONS.increaseThreshold} windowSeconds={ALARM_OPTIONS.windowSeconds} min={card.min} max={card.max} /> : <SensorChart readings={chartReadings} field={card.field} color={card.color} min={card.min} max={card.max} unit={card.unit} />}
          </article>)}
        </div>
      </section>

      <section className="lower-grid">
        <article className="panel alarm-panel"><div className="panel-heading"><div><p className="eyebrow">EVENT HISTORY</p><h2 className="section-title">Alarm journal</h2></div><span className="counter">{alarms.length}</span></div>{alarms.length === 0 ? <p className="empty-state">No events in this session. Use the simulator controls to inject a scenario.</p> : <div className="alarm-table alarm-history-table"><div className="alarm-table-header"><span>TAG</span><span>ACTIVE TIME</span><span>STATE</span><span>PRIORITY</span><span>ACTION</span></div>{alarms.slice().reverse().map((alarm) => <div className={`alarm-table-row alarm-${alarm.status}`} key={alarm.id}><span><strong>PIT VOLUME</strong><small>{alarm.message}</small></span><span>{formatTime(alarm.timestamp)}</span><span>{alarm.status}</span><span className="alarm-priority">{alarmPriority(alarm.status)}</span><span>{alarm.status === 'active' ? <button className="button compact" onClick={() => acknowledgeAlarm(alarm.id)}>Acknowledge</button> : alarm.status === 'cleared' ? formatTime(alarm.clearedAt) : '—'}</span></div>)}</div>}</article>
        <article className="panel controls-panel"><div className="panel-heading"><div><p className="eyebrow">SIMULATOR / INSTRUCTOR</p><h2 className="section-title">Scenario controls</h2></div></div><p className="control-warning"><span aria-hidden="true">ⓘ</span> Demo controls only. No real equipment is connected.</p><label className="scenario-control"><span className="eyebrow">SCENARIO</span><select value={scenario} onChange={(event) => startScenario(event.target.value as Scenario)} aria-label="Choose a rig scenario">{scenarios.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><button className="button kick-button" onClick={injectKick}>Inject simulated kick <span>↗</span></button><div className="control-notes"><p>The detector compares pit volume now with the reading at least 5 seconds ago.</p><p>A change strictly greater than 50 bbl starts one alarm. A 15-second cooldown prevents rapid re-triggering.</p></div></article>
      </section>
      <footer>RigWatch is a simulated learning project. It uses no real Pason data, products, or equipment controls.</footer>
    </main>
  );
}

export default App;
