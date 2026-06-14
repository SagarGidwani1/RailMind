import React from 'react';

/**
 * TrainTable — Clean table showing all trains with status chips.
 * Now rendered inline below the map (no separate panel header needed).
 */
export default function TrainTable({ trains, cascadeData }) {
  const sourceTrainNo = cascadeData?.source_train?.train_no;

  const stationNames = {
    CSMT: 'Mumbai CST', TNA: 'Thane', KJT: 'Karjat',
    LNL: 'Lonavala', KK: 'Khadki', PUNE: 'Pune Jn',
  };

  const getRowClass = (train) => {
    if (train.train_no === sourceTrainNo) return 'row-delayed';
    if (train.status === 'delayed') return 'row-delayed';
    if (train.status === 'at_risk') return 'row-at-risk';
    return '';
  };

  const formatStatus = (status) => status.replace('_', ' ');

  return (
    <>
      <div className="train-table-header">
        <div className="train-table-title">
          <span>📋</span> Train Status
        </div>
        <span style={{ fontSize: 11, color: 'var(--text-400)' }}>
          {trains.length} trains on corridor
        </span>
      </div>
      <div className="train-table-scroll">
        <table className="train-table" id="train-status-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Train</th>
              <th>Name</th>
              <th>From</th>
              <th>To</th>
              <th>Sched.</th>
              <th>Actual</th>
              <th>Delay</th>
              <th>Location</th>
              <th>Pax</th>
            </tr>
          </thead>
          <tbody>
            {trains.map(train => (
              <tr key={train.train_no} className={getRowClass(train)} id={`train-row-${train.train_no}`}>
                <td>
                  <span className={`status-chip ${train.status.replace('_', '-')}`}>
                    <span className="status-chip-dot" />
                    {formatStatus(train.status)}
                  </span>
                </td>
                <td className="train-no-cell">{train.train_no}</td>
                <td>{train.name}</td>
                <td>{stationNames[train.from_station] || train.from_station}</td>
                <td>{stationNames[train.to_station] || train.to_station}</td>
                <td>{train.scheduled_dep}</td>
                <td style={{
                  color: train.delay_minutes > 0 ? 'var(--red)' : 'inherit',
                  fontWeight: train.delay_minutes > 0 ? 600 : 400,
                }}>
                  {train.actual_dep}
                </td>
                <td>
                  <span className={`delay-cell ${train.delay_minutes > 0 ? 'has-delay' : ''}`}>
                    {train.delay_minutes > 0 ? `+${train.delay_minutes}m` : '—'}
                  </span>
                </td>
                <td>{stationNames[train.current_station] || train.current_station}</td>
                <td className="pax-cell">{train.passengers_count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
