import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';

/**
 * NetworkMap — Clean D3 railway corridor visualization.
 * Stations as clean circles, trains as labeled chips, cascade as dashed red lines.
 */
export default function NetworkMap({ network, trains, cascadeData }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [popup, setPopup] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  const stationNames = {
    CSMT: 'Mumbai CST', TNA: 'Thane', KJT: 'Karjat',
    LNL: 'Lonavala', KK: 'Khadki', PUNE: 'Pune Jn',
  };

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver(entries => {
      for (const e of entries) {
        setDimensions({ width: e.contentRect.width, height: e.contentRect.height });
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  // D3 render
  useEffect(() => {
    if (!network?.nodes || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const { width, height } = dimensions;
    const margin = { top: 60, right: 70, bottom: 60, left: 70 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const stationOrder = ['CSMT', 'TNA', 'KJT', 'LNL', 'KK', 'PUNE'];
    const nodes = network.nodes;
    const links = network.links || [];

    // Position stations on a gentle curve
    const positions = {};
    stationOrder.forEach((code, i) => {
      const t = i / (stationOrder.length - 1);
      positions[code] = {
        x: margin.left + t * innerW,
        y: margin.top + innerH / 2 + Math.sin(t * Math.PI) * (innerH * 0.22),
      };
    });

    const g = svg.append('g');

    // Draw tracks
    links.forEach(link => {
      const s = positions[link.source];
      const t = positions[link.target];
      if (!s || !t) return;

      // Track line
      g.append('line')
        .attr('x1', s.x).attr('y1', s.y)
        .attr('x2', t.x).attr('y2', t.y)
        .attr('stroke', '#e2e8f0').attr('stroke-width', 3)
        .attr('stroke-linecap', 'round');

      // Distance label
      const mx = (s.x + t.x) / 2;
      const my = (s.y + t.y) / 2 - 16;
      g.append('text')
        .attr('x', mx).attr('y', my)
        .attr('text-anchor', 'middle')
        .attr('class', 'track-distance')
        .text(`${link.distance_km} km`);
    });

    // Cascade lines
    if (cascadeData?.affected_trains?.length > 0) {
      const srcPos = positions[cascadeData.source_train.current_station];
      if (srcPos) {
        cascadeData.affected_trains.forEach(aff => {
          const affPos = positions[aff.current_station];
          if (affPos) {
            g.append('line')
              .attr('class', 'cascade-line')
              .attr('x1', srcPos.x).attr('y1', srcPos.y)
              .attr('x2', affPos.x).attr('y2', affPos.y);
          }
        });
      }
    }

    // Draw station nodes
    stationOrder.forEach(code => {
      const pos = positions[code];
      const nodeData = nodes.find(n => n.id === code);
      if (!pos || !nodeData) return;

      const sGroup = g.append('g')
        .attr('class', 'station-node')
        .attr('transform', `translate(${pos.x}, ${pos.y})`)
        .on('click', (event) => {
          event.stopPropagation();
          setPopup({
            station: nodeData,
            trains: trains.filter(t => t.current_station === code),
            x: pos.x,
            y: pos.y,
          });
        });

      // Outer circle
      sGroup.append('circle').attr('class', 'station-outer').attr('r', 18);
      // Inner circle
      sGroup.append('circle').attr('class', 'station-inner').attr('r', 12);
      // Code text
      sGroup.append('text').attr('class', 'station-code').attr('dy', '3.5px').text(code);
      // Name below
      sGroup.append('text').attr('class', 'station-name').attr('y', 32).text(stationNames[code] || code);
      // Platform info
      sGroup.append('text').attr('class', 'station-plat').attr('y', 44)
        .text(`${nodeData.platform_count} platforms`);
    });

    // Draw train indicators
    trains.forEach(train => {
      const pos = positions[train.current_station];
      if (!pos) return;

      const trainsHere = trains.filter(t => t.current_station === train.current_station);
      const idx = trainsHere.indexOf(train);
      const total = trainsHere.length;

      // Fan trains out above/below the station
      const spacing = 22;
      const startOffset = -((total - 1) * spacing) / 2;
      const offsetY = -34 + startOffset + idx * spacing;

      const tGroup = g.append('g')
        .attr('class', `train-indicator ${train.status === 'on_time' ? '' : train.status}`)
        .attr('transform', `translate(${pos.x}, ${pos.y + offsetY})`);

      // Pill background
      const pillW = 48;
      const pillH = 18;
      tGroup.append('rect')
        .attr('class', 'train-bg')
        .attr('x', -pillW / 2).attr('y', -pillH / 2)
        .attr('width', pillW).attr('height', pillH)
        .attr('rx', 4);

      // Train number
      tGroup.append('text')
        .attr('class', 'train-label')
        .attr('dy', '3.5px')
        .text(train.train_no);
    });

    // Click background to dismiss popup
    svg.on('click', () => setPopup(null));

  }, [network, trains, cascadeData, dimensions]);

  return (
    <div className="network-map-container" ref={containerRef} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} className="network-svg" />

      {popup && (
        <div
          className="station-popup"
          style={{
            left: Math.min(popup.x, dimensions.width - 220) + 'px',
            top: Math.min(popup.y + 30, dimensions.height - 180) + 'px',
          }}
        >
          <h3>{stationNames[popup.station.id] || popup.station.name}</h3>
          <div className="popup-code">{popup.station.id} • {popup.station.zone} Zone</div>
          <div className="popup-meta">
            <div className="popup-meta-item"><strong>{popup.station.platform_count}</strong> platforms</div>
            <div className="popup-meta-item"><strong>{popup.trains.length}</strong> trains</div>
          </div>
          {popup.trains.length > 0 ? (
            popup.trains.map(t => (
              <div className="popup-train" key={t.train_no}>
                <span className={`status-chip-dot`} style={{
                  width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                  background: t.status === 'on_time' ? '#16a34a' : t.status === 'delayed' ? '#dc2626' : '#d97706',
                }} />
                <span className="train-no">{t.train_no}</span>
                <span style={{ color: 'var(--text-400)', fontSize: 11 }}>P{t.platform_no}</span>
              </div>
            ))
          ) : (
            <div style={{ fontSize: 12, color: 'var(--text-400)', fontStyle: 'italic', marginTop: 4 }}>No trains present</div>
          )}
        </div>
      )}
    </div>
  );
}
