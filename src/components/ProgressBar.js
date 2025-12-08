import React from 'react';
import './ProgressBar.css';

function ProgressBar({ stage, progress }) {
  const stages = [
    'Generating embeddings',
    'Reducing dimensions',
    'Clustering topics',
    'Extracting keywords',
    'Creating visualizations'
  ];
  
  const currentStageIndex = stages.indexOf(stage);
  const overallProgress = currentStageIndex >= 0 
    ? ((currentStageIndex + progress) / stages.length) * 100
    : 0;
  
  return (
    <div className="progress-container">
      <div className="progress-info">
        <h3>Processing Documents</h3>
        <p className="current-stage">{stage}</p>
      </div>
      
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${overallProgress}%` }}
        />
      </div>
      
      <div className="progress-percentage">
        {Math.round(overallProgress)}%
      </div>
      
      <div className="stage-list">
        {stages.map((s, idx) => (
          <div 
            key={s}
            className={`stage-item ${
              idx < currentStageIndex ? 'completed' : 
              idx === currentStageIndex ? 'active' : 
              'pending'
            }`}
          >
            <span className="stage-indicator">
              {idx < currentStageIndex ? '✓' : idx + 1}
            </span>
            <span className="stage-name">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ProgressBar;
