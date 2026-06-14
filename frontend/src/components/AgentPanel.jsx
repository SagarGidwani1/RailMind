import React, { useRef, useEffect, useMemo } from 'react';

/**
 * AgentPanel — Storytelling right sidebar.
 * Shows cascade effects as a narrative timeline, then streams AI recommendations.
 *
 * Story flow:
 * 1. "Train X is delayed by Y minutes at Station Z"
 * 2. "This affects N trains downstream..."
 * 3. Each affected train shown as a card
 * 4. "Here's what RailMind recommends..."
 * 5. Streaming recommendations
 */
export default function AgentPanel({ agentResponse, isStreaming, delaySaved, cascadeData, trains }) {
  const contentRef = useRef(null);

  const stationNames = {
    CSMT: 'Mumbai CST', TNA: 'Thane', KJT: 'Karjat',
    LNL: 'Lonavala', KK: 'Khadki', PUNE: 'Pune Junction',
  };

  // Auto-scroll
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [agentResponse, isStreaming, cascadeData]);

  // Parse recommendations from the streamed text
  const recommendations = useMemo(() => {
    if (!agentResponse) return [];
    const cards = [];
    const lines = agentResponse.split('\n');
    let current = null;

    lines.forEach(line => {
      const match = line.match(/^###\s*(HOLD|SWAP|ALERT|CANCEL|SUMMARY)\s*[—-]?\s*(.*)/i);
      if (match) {
        if (current) cards.push(current);
        current = {
          type: match[1].toLowerCase(),
          trainInfo: match[2].trim(),
          body: [],
        };
      } else if (current) {
        current.body.push(line);
      }
    });
    if (current) cards.push(current);
    return cards;
  }, [agentResponse]);

  // No cascade — idle state
  if (!cascadeData && !isStreaming) {
    return (
      <div className="story-panel">
        <div className="story-header">
          <div className="story-header-title">🧠 RailMind Insights</div>
          <div className="story-header-sub">AI-powered delay analysis</div>
        </div>
        <div className="story-content">
          <div className="story-idle">
            <div className="story-idle-visual">🚆</div>
            <div className="story-idle-title">All trains running on time</div>
            <div className="story-idle-desc">
              Select a train and simulate a delay to see how it cascades through the corridor and what actions RailMind recommends.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const source = cascadeData?.source_train;
  const affected = cascadeData?.affected_trains || [];
  const totalPax = cascadeData?.total_passengers_affected || 0;

  return (
    <div className="story-panel">
      <div className="story-header">
        <div className="story-header-title">🧠 RailMind Insights</div>
        <div className="story-header-sub">
          {isStreaming ? 'Analyzing cascade impact...' : `${affected.length} trains affected`}
        </div>
      </div>

      <div className="story-content" ref={contentRef}>
        <div className="story-timeline">
          {/* Step 1: The delay event */}
          {source && (
            <div className="story-step" style={{ animationDelay: '0s' }}>
              <div className="story-step-dot filled" />
              <div className="story-step-title">
                🚨 Train {source.train_no} delayed
              </div>
              <div className="story-step-desc">
                Delayed by <strong>{source.delay_minutes} minutes</strong> at{' '}
                {stationNames[source.current_station] || source.current_station}
              </div>
              <div className="story-step-detail">
                <strong>{source.name}</strong> was scheduled to depart on time but encountered a {source.delay_minutes}-minute delay.
                This is now blocking downstream sections of the corridor.
              </div>
            </div>
          )}

          {/* Step 2: Cascade summary */}
          {affected.length > 0 && (
            <div className="story-step" style={{ animationDelay: '0.15s' }}>
              <div className="story-step-dot amber" />
              <div className="story-step-title">
                Cascade affects {affected.length} train{affected.length > 1 ? 's' : ''}
              </div>
              <div className="story-step-desc">
                {totalPax.toLocaleString()} passengers are impacted across the corridor.
                Delays propagate through shared track sections.
              </div>

              {/* Affected train cards */}
              {affected.map((aff, i) => (
                <div
                  key={aff.train_no}
                  className={`affected-train-card ${aff.predicted_delay >= 20 ? 'severe' : ''}`}
                  style={{ animationDelay: `${0.2 + i * 0.1}s` }}
                >
                  <div className="affected-train-info">
                    <div className="affected-train-name">
                      {aff.train_no} — {aff.name}
                    </div>
                    <div className="affected-train-sub">
                      at {stationNames[aff.current_station] || aff.current_station}
                      {' • '}{aff.passengers_count.toLocaleString()} pax
                    </div>
                  </div>
                  <div className="affected-train-delay">
                    +{aff.predicted_delay}m
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: AI Recommendations */}
          {(agentResponse || isStreaming) && (
            <div className="story-step" style={{ animationDelay: '0.3s' }}>
              <div className="story-step-dot blue" />
              <div className="story-step-title">
                RailMind recommendations
              </div>
              <div className="story-step-desc">
                {isStreaming && !agentResponse
                  ? 'Analyzing scenario and generating operational guidance...'
                  : 'Actions to minimize delay impact:'}
              </div>

              {/* Typing indicator */}
              {isStreaming && !agentResponse && (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}

              {/* Recommendation cards */}
              {recommendations.map((reco, i) => (
                <div className="reco-card" key={i} style={{ animationDelay: `${0.4 + i * 0.1}s` }}>
                  <div className="reco-header">
                    <span className={`reco-badge ${reco.type}`}>
                      {reco.type.toUpperCase()}
                    </span>
                    {reco.trainInfo && (
                      <span className="reco-train">{reco.trainInfo}</span>
                    )}
                  </div>
                  <div
                    className="reco-body"
                    dangerouslySetInnerHTML={{
                      __html: reco.body
                        .join('\n')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br/>'),
                    }}
                  />
                </div>
              ))}

              {/* Still streaming */}
              {isStreaming && agentResponse && (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              )}
            </div>
          )}

          {/* Step 4: Resolution complete */}
          {!isStreaming && agentResponse && (
            <div className="story-step" style={{ animationDelay: '0.5s' }}>
              <div className="story-step-dot green" />
              <div className="story-step-title">
                Analysis complete
              </div>
              <div className="story-step-desc">
                Follow the recommendations above to minimize cascade impact on the corridor.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer with delay saved */}
      {delaySaved > 0 && (
        <div className="story-footer">
          <div className="story-footer-label">Est. delay saved</div>
          <div className="story-footer-value">{delaySaved} min</div>
        </div>
      )}
    </div>
  );
}
