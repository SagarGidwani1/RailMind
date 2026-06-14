import React, { useState } from 'react';

/**
 * ControlPanel — Clean sidebar with train selector, delay slider, and action buttons.
 */
export default function ControlPanel({ trains, onTriggerDelay, onReset, isLoading }) {
  const [selectedTrain, setSelectedTrain] = useState('12127');
  const [delayMinutes, setDelayMinutes] = useState(45);

  const hasDelays = trains.some(t => t.status !== 'on_time');
  const selectedTrainData = trains.find(t => t.train_no === selectedTrain);

  const handleTrigger = () => {
    if (selectedTrain && delayMinutes > 0) {
      onTriggerDelay(selectedTrain, delayMinutes);
    }
  };

  const sliderFillPercent = (delayMinutes / 120) * 100;

  // Get station full name from code
  const stationNames = {
    CSMT: 'Mumbai CST',
    TNA: 'Thane',
    KJT: 'Karjat',
    LNL: 'Lonavala',
    KK: 'Khadki',
    PUNE: 'Pune Jn',
  };

  return (
    <div className="control-panel">
      {/* Status */}
      <div className="panel-section">
        <div className={`system-status-pill ${hasDelays ? 'alert' : 'nominal'}`}>
          <span>{hasDelays ? '⚠' : '✓'}</span>
          {hasDelays ? 'Delays detected in corridor' : 'All systems nominal'}
        </div>
      </div>

      {/* Train Selector */}
      <div className="panel-section">
        <div className="panel-section-title">Select Train</div>
        <select
          id="train-selector"
          className="clean-select"
          value={selectedTrain}
          onChange={(e) => setSelectedTrain(e.target.value)}
          disabled={isLoading}
        >
          {trains.map(train => (
            <option key={train.train_no} value={train.train_no}>
              {train.train_no} — {train.name}
            </option>
          ))}
        </select>

        {selectedTrainData && (
          <div className="train-info-card">
            <div className="train-info-row">
              <span className="train-info-label">Route</span>
              <span className="train-route-badge">
                {stationNames[selectedTrainData.from_station] || selectedTrainData.from_station}
                {' → '}
                {stationNames[selectedTrainData.to_station] || selectedTrainData.to_station}
              </span>
            </div>
            <div className="train-info-row">
              <span className="train-info-label">Currently at</span>
              <span className="train-info-value">
                {stationNames[selectedTrainData.current_station] || selectedTrainData.current_station}
              </span>
            </div>
            <div className="train-info-row">
              <span className="train-info-label">Platform</span>
              <span className="train-info-value">{selectedTrainData.platform_no}</span>
            </div>
            <div className="train-info-row">
              <span className="train-info-label">Passengers</span>
              <span className="train-info-value">{selectedTrainData.passengers_count.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>

      {/* Delay Slider */}
      <div className="panel-section">
        <div className="panel-section-title">Delay Duration</div>
        <div className="delay-slider-container">
          <div className="delay-display">
            <span className="delay-number">{delayMinutes}</span>
            <span className="delay-unit">min</span>
          </div>

          <div className="slider-wrapper">
            <div
              className="slider-track-fill"
              style={{ width: `${sliderFillPercent}%` }}
            />
            <input
              id="delay-slider"
              type="range"
              className="clean-slider"
              min="0"
              max="120"
              value={delayMinutes}
              onChange={(e) => setDelayMinutes(Number(e.target.value))}
              disabled={isLoading}
            />
          </div>

          <div className="slider-labels">
            <span>0 min</span>
            <span>30</span>
            <span>60</span>
            <span>90</span>
            <span>120 min</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="panel-section">
        <div className="btn-group">
          <button
            id="trigger-delay-btn"
            className="btn btn-danger"
            onClick={handleTrigger}
            disabled={isLoading || delayMinutes === 0}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                Processing...
              </>
            ) : (
              <>⚡ Simulate Delay</>
            )}
          </button>

          <button
            id="reset-btn"
            className="btn btn-outline"
            onClick={onReset}
            disabled={isLoading}
          >
            ↺ Reset All Trains
          </button>
        </div>
      </div>
    </div>
  );
}
