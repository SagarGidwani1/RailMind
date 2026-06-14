import React from 'react';
import { useMemo } from 'react';

/**
 * StatsBar — Top gauge cards showing operational metrics.
 * Metal gauge-style cards: Total Trains, On Time, Delayed, Passengers Affected
 */
export default function StatsBar({ trains }) {
  const stats = useMemo(() => {
    const total = trains.length;
    const onTime = trains.filter(t => t.status === 'on_time').length;
    const delayed = trains.filter(t => t.status === 'delayed' || t.status === 'at_risk').length;
    const passengersAffected = trains
      .filter(t => t.status !== 'on_time')
      .reduce((sum, t) => sum + t.passengers_count, 0);

    return { total, onTime, delayed, passengersAffected };
  }, [trains]);

  const gaugeCircumference = 2 * Math.PI * 22; // radius = 22

  return (
    <div className="stats-bar">
      <StatCard
        type="total"
        label="Total Trains"
        value={stats.total}
        max={8}
        circumference={gaugeCircumference}
      />
      <StatCard
        type="on-time"
        label="On Time"
        value={stats.onTime}
        max={8}
        circumference={gaugeCircumference}
      />
      <StatCard
        type="delayed"
        label="Delayed"
        value={stats.delayed}
        max={8}
        circumference={gaugeCircumference}
      />
      <StatCard
        type="passengers"
        label="Pax Affected"
        value={stats.passengersAffected}
        max={8000}
        circumference={gaugeCircumference}
        formatValue={(v) => v > 0 ? v.toLocaleString() : '0'}
      />
    </div>
  );
}

function StatCard({ type, label, value, max, circumference, formatValue }) {
  const ratio = Math.min(value / max, 1);
  const dashoffset = circumference * (1 - ratio);

  return (
    <div className={`stat-card ${type}`}>
      <div className="stat-gauge">
        <svg viewBox="0 0 56 56">
          <circle className="gauge-bg" cx="28" cy="28" r="22" />
          <circle
            className="gauge-fill"
            cx="28"
            cy="28"
            r="22"
            strokeDasharray={circumference}
            strokeDashoffset={dashoffset}
          />
        </svg>
        <div className="gauge-value">
          {type === 'passengers' ? (value > 0 ? Math.round(value / 1000) + 'K' : '0') : value}
        </div>
      </div>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value">
          {formatValue ? formatValue(value) : value}
        </span>
      </div>
    </div>
  );
}
