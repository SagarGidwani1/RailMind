import React, { useState, useEffect, useCallback, useMemo } from 'react';
import StatsBar from './components/StatsBar';
import ControlPanel from './components/ControlPanel';
import NetworkMap from './components/NetworkMap';
import AgentPanel from './components/AgentPanel';
import TrainTable from './components/TrainTable';
import './styles/skeuomorphic.css';

const API_URL = import.meta.env.VITE_API_URL || "https://railmind-backend-f3op.onrender.com";
/**
 * RailMind — AI-Powered Indian Railways Cascade Delay Prediction & Resolution
 * Clean storytelling dashboard layout
 */
export default function App() {
  const [trains, setTrains] = useState([]);
  const [network, setNetwork] = useState(null);
  const [cascadeData, setCascadeData] = useState(null);
  const [agentResponse, setAgentResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [delaySaved, setDelaySaved] = useState(0);
  const [error, setError] = useState(null);

  // Compute stats
  const stats = useMemo(() => {
    const total = trains.length;
    const onTime = trains.filter(t => t.status === 'on_time').length;
    const delayed = trains.filter(t => t.status === 'delayed' || t.status === 'at_risk').length;
    const paxAffected = trains
      .filter(t => t.status !== 'on_time')
      .reduce((sum, t) => sum + t.passengers_count, 0);
    return { total, onTime, delayed, paxAffected };
  }, [trains]);

  // ─── Fetch initial data ───────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [trainsRes, networkRes] = await Promise.all([
          fetch(`${API_BASE}/api/trains`),
          fetch(`${API_BASE}/api/network`),
        ]);

        if (!trainsRes.ok || !networkRes.ok) {
          throw new Error('Failed to connect to RailMind backend');
        }

        const trainsData = await trainsRes.json();
        const networkData = await networkRes.json();

        setTrains(trainsData.trains);
        setNetwork(networkData);
        setError(null);
      } catch (err) {
        setError(err.message);
      }
    };

    init();
  }, []);

  // ─── Trigger delay & cascade ──────────────────────────────────
  const handleTriggerDelay = useCallback(async (trainNo, delayMinutes) => {
    setIsLoading(true);
    setAgentResponse('');
    setCascadeData(null);
    setDelaySaved(0);

    try {
      // 1. Simulate the delay
      const simRes = await fetch(`${API_BASE}/api/simulate-delay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ train_no: trainNo, delay_minutes: delayMinutes }),
      });

      if (!simRes.ok) {
        const err = await simRes.json();
        throw new Error(err.detail || 'Simulation failed');
      }

      const simData = await simRes.json();
      setTrains(simData.trains);
      setCascadeData(simData.cascade);

      // Re-fetch network
      const netRes = await fetch(`${API_BASE}/api/network`);
      if (netRes.ok) {
        setNetwork(await netRes.json());
      }

      // 2. Stream AI recommendations
      setIsStreaming(true);
      setIsLoading(false);

      const agentRes = await fetch(`${API_BASE}/api/agent/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ train_no: trainNo, delay_minutes: delayMinutes }),
      });

      if (!agentRes.ok) throw new Error('Agent request failed');

      const reader = agentRes.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              setIsStreaming(false);
              const savedMatch = fullText.match(/Total Estimated Delay Saved:\s*(\d+)/i);
              if (savedMatch) {
                setDelaySaved(parseInt(savedMatch[1]));
              } else {
                const totalSaved = (simData.cascade.affected_trains || [])
                  .reduce((sum, t) => sum + Math.round(t.predicted_delay * 0.5), 0);
                setDelaySaved(totalSaved);
              }
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullText += parsed.text;
                setAgentResponse(fullText);
              }
              if (parsed.error) {
                fullText += `\nError: ${parsed.error}`;
                setAgentResponse(fullText);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setError(err.message);
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, []);

  // ─── Reset all trains ─────────────────────────────────────────
  const handleReset = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/reset`, { method: 'POST' });
      if (!res.ok) throw new Error('Reset failed');

      const data = await res.json();
      setTrains(data.trains);
      setCascadeData(null);
      setAgentResponse('');
      setDelaySaved(0);
      setError(null);

      const netRes = await fetch(`${API_BASE}/api/network`);
      if (netRes.ok) setNetwork(await netRes.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Error state ──────────────────────────────────────────────
  if (error && trains.length === 0) {
    return (
      <div className="error-screen">
        <div className="error-icon">!</div>
        <div className="error-title">Cannot connect to RailMind</div>
        <div className="error-desc">
          Make sure the backend server is running on port 8000 before starting the dashboard.
        </div>
        <code className="error-code">cd backend && uvicorn main:app --reload --port 8000</code>
        <button className="btn btn-primary" onClick={() => window.location.reload()} style={{ width: 'auto', marginTop: 12 }}>
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* ─── Header ─── */}
      <header className="app-header">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon">R</div>
            <div className="logo-text">Rail<span>Mind</span></div>
          </div>
          <div className="header-divider" />
          <div className="header-subtitle">Dashboard</div>
        </div>

        <div className="header-stats">
          <div className="header-stat">
            <div className="header-stat-dot green" />
            <div>
              <div className="header-stat-value">{stats.onTime}</div>
              <div className="header-stat-label">On Time</div>
            </div>
          </div>
          <div className="header-stat">
            <div className={`header-stat-dot ${stats.delayed > 0 ? 'red' : 'green'}`} />
            <div>
              <div className="header-stat-value">{stats.delayed}</div>
              <div className="header-stat-label">Delayed</div>
            </div>
          </div>
          <div className="header-stat">
            <div className="header-stat-dot amber" />
            <div>
              <div className="header-stat-value">{stats.paxAffected > 0 ? stats.paxAffected.toLocaleString() : '0'}</div>
              <div className="header-stat-label">Pax Affected</div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <div className="main-content">
        <ControlPanel
          trains={trains}
          onTriggerDelay={handleTriggerDelay}
          onReset={handleReset}
          isLoading={isLoading || isStreaming}
        />

        <div className="network-panel">
          <div className="network-panel-inner">
            <div className="network-header">
              <div className="network-title">
                <span className="network-title-icon">🗺️</span>
                Mumbai — Pune Corridor
              </div>
              <div className={`network-badge ${stats.delayed > 0 ? 'has-delays' : ''}`}>
                {stats.delayed > 0
                  ? `${stats.delayed} train${stats.delayed > 1 ? 's' : ''} delayed`
                  : 'All clear'}
              </div>
            </div>
            <div className="network-map-container">
              <NetworkMap
                network={network}
                trains={trains}
                cascadeData={cascadeData}
              />
            </div>
          </div>

          <div className="train-table-panel">
            <TrainTable trains={trains} cascadeData={cascadeData} />
          </div>
        </div>

        <AgentPanel
          agentResponse={agentResponse}
          isStreaming={isStreaming}
          delaySaved={delaySaved}
          cascadeData={cascadeData}
          trains={trains}
        />
      </div>
    </div>
  );
}
