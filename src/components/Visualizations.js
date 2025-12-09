import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import './Visualizations.css';

function Visualizations({ results, onReprocess, isProcessing, progress, clusteringMethod, setClusteringMethod }) {
  const { documents, coordinates, clusters, topics, topicLabels } = results;
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [showRawData, setShowRawData] = useState(false);
  const [editedDocuments, setEditedDocuments] = useState(documents.join('\n'));
  const [isEditing, setIsEditing] = useState(false);
  
  // Update editedDocuments when documents change
  useEffect(() => {
    setEditedDocuments(documents.join('\n'));
  }, [documents]);
  
  const toggleTopic = (topicId) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };
  
  // Calculate fixed axis ranges based on all data points
  const allX = coordinates.map(coord => coord[0]);
  const allY = coordinates.map(coord => coord[1]);
  const xMin = Math.min(...allX);
  const xMax = Math.max(...allX);
  const yMin = Math.min(...allY);
  const yMax = Math.max(...allY);
  
  // Add 10% padding to the ranges
  const xPadding = (xMax - xMin) * 0.1;
  const yPadding = (yMax - yMin) * 0.1;
  const xRange = [xMin - xPadding, xMax + xPadding];
  const yRange = [yMin - yPadding, yMax + yPadding];
  
  // Prepare scatter plot data
  const scatterData = (() => {
    const uniqueClusters = [...new Set(clusters)].sort((a, b) => {
      // Sort: put -1 (outliers) at the end, others in ascending order
      if (a === -1) return 1;
      if (b === -1) return -1;
      return a - b;
    });
    const colors = generateColors(uniqueClusters.length);
    
    return uniqueClusters.map(clusterId => {
      const clusterIndices = clusters
        .map((c, idx) => c === clusterId ? idx : -1)
        .filter(idx => idx !== -1);
      
      return {
        x: clusterIndices.map(idx => coordinates[idx][0]),
        y: clusterIndices.map(idx => coordinates[idx][1]),
        text: clusterIndices.map(idx => documents[idx]),
        mode: 'markers',
        type: 'scatter',
        name: topicLabels[clusterId] || `Cluster ${clusterId}`,
        marker: {
          size: 16,
          color: clusterId === -1 ? '#cccccc' : colors[clusterId % colors.length],
          opacity: 0.7
        },
        hovertemplate: '<b>%{text}</b><br>Topic: ' + 
          (topicLabels[clusterId] || `Cluster ${clusterId}`) + 
          '<extra></extra>'
      };
    });
  })();
  
  const scatterLayout = {
    title: '',
    xaxis: { 
      title: '', 
      showgrid: false,
      range: xRange,
      fixedrange: false,
      showticklabels: false,
      showline: false,
      zeroline: false
    },
    yaxis: { 
      title: '', 
      showgrid: false,
      range: yRange,
      fixedrange: false,
      showticklabels: false,
      showline: false,
      zeroline: false
    },
    hovermode: 'closest',
    showlegend: true,
    legend: {
      font: {
        size: 14
      }
    },
    height: 800,
    paper_bgcolor: 'white',
    plot_bgcolor: '#ffffff'
  };
  
  // Prepare topic keywords table
  const topicKeywordsData = Object.entries(topics)
    .filter(([clusterId]) => clusterId !== '-1')
    .map(([clusterId, keywords]) => ({
      id: clusterId,
      label: topicLabels[clusterId] || `Topic ${clusterId}`,
      keywords: keywords.slice(0, 10).map(k => k.term).join(', '),
      count: clusters.filter(c => c === parseInt(clusterId)).length,
      documents: clusters
        .map((c, idx) => c === parseInt(clusterId) ? documents[idx] : null)
        .filter(doc => doc !== null)
    }))
    .sort((a, b) => b.count - a.count);
  
  // Prepare outliers data separately
  const outliersCount = clusters.filter(c => c === -1).length;
  const outlierDocuments = clusters
    .map((c, idx) => c === -1 ? documents[idx] : null)
    .filter(doc => doc !== null);
  
  const hasOutliers = outliersCount > 0;
  
  return (
    <>
      <div className="stats">
        <div className="stat-item">
          <span className="stat-label">Total Documents:</span>
          <span className="stat-value">{documents.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Topics Found:</span>
          <span className="stat-value">{Object.keys(topics).filter(k => k !== '-1').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Outliers:</span>
          <span className="stat-value">{clusters.filter(c => c === -1).length}</span>
        </div>
      </div>

      <div className="raw-data-section">
        <div 
          className="raw-data-header"
          onClick={() => setShowRawData(!showRawData)}
        >
          <span className="toggle-icon">{showRawData ? '▼' : '▶'}</span>
          <span>Input Documents</span>
        </div>
        {showRawData && (
          <>
            <div className="raw-data-content">
              {isEditing ? (
                <>
                  <div className="edit-mode-indicator">
                    ✏️ Edit Mode - Modify documents below (one per line)
                  </div>
                  <div className="clustering-method-selector">
                    <label className="clustering-label">Clustering Method:</label>
                    <div className="radio-group-inline">
                      <label className="radio-label-inline">
                        <input
                          type="radio"
                          value="kmeans"
                          checked={clusteringMethod === 'kmeans'}
                          onChange={(e) => setClusteringMethod(e.target.value)}
                          disabled={isProcessing}
                        />
                        <span>K-Means</span>
                      </label>
                      <label className="radio-label-inline">
                        <input
                          type="radio"
                          value="dbscan"
                          checked={clusteringMethod === 'dbscan'}
                          onChange={(e) => setClusteringMethod(e.target.value)}
                          disabled={isProcessing}
                        />
                        <span>DBSCAN</span>
                      </label>
                    </div>
                  </div>
                  <textarea
                    className="raw-data-editor"
                    value={editedDocuments}
                    onChange={(e) => setEditedDocuments(e.target.value)}
                    placeholder="Enter one document per line..."
                  />
                </>
              ) : (
                <pre>{documents.join('\n')}</pre>
              )}
            </div>
            <div className="raw-data-actions">
              {isEditing ? (
                <>
                  <button 
                    className="button button-primary"
                    onClick={() => {
                      const newDocs = editedDocuments
                        .split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 0);
                      if (newDocs.length > 0) {
                        onReprocess(newDocs);
                        setIsEditing(false);
                      } else {
                        alert('Please enter at least one document');
                      }
                    }}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <>
                        <span className="spinner"></span>
                        {progress.stage || 'Processing...'}
                      </>
                    ) : (
                      'Recalculate Results'
                    )}
                  </button>
                  <button 
                    className="button button-secondary"
                    onClick={() => {
                      setEditedDocuments(documents.join('\n'));
                      setIsEditing(false);
                    }}
                    disabled={isProcessing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button 
                  className="button button-primary"
                  onClick={() => setIsEditing(true)}
                  disabled={isProcessing}
                >
                  Edit Documents
                </button>
              )}
            </div>
          </>
        )}
      </div>
      
      <div style={{ width: '90%', margin: '2rem auto' }}>
        <Plot
          data={scatterData}
          layout={scatterLayout}
          config={{ responsive: true }}
          style={{ width: '100%' }}
        />
      </div>
      
      <div className="keywords-table">
        <table>
          <thead>
            <tr>
              <th>Topic</th>
              <th>Documents</th>
              <th>Top Keywords</th>
            </tr>
          </thead>
          <tbody>
            {topicKeywordsData.map(topic => (
              <React.Fragment key={topic.id}>
                <tr 
                  onClick={() => toggleTopic(topic.id)}
                  style={{ cursor: 'pointer' }}
                  className={expandedTopics.has(topic.id) ? 'expanded' : ''}
                >
                  <td>
                    <strong>
                      <span style={{ marginRight: '8px' }}>
                        {expandedTopics.has(topic.id) ? '▼' : '▶'}
                      </span>
                      {topic.label}
                    </strong>
                  </td>
                  <td>{topic.count}</td>
                  <td>{topic.keywords}</td>
                </tr>
                {expandedTopics.has(topic.id) && (
                  <tr className="documents-row">
                    <td colSpan="3">
                      <div className="documents-list">
                        <ul>
                          {topic.documents.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
            {hasOutliers && (
              <React.Fragment key="outliers">
                <tr 
                  onClick={() => toggleTopic('outliers')}
                  style={{ cursor: 'pointer', backgroundColor: '#f9f9f9' }}
                  className={expandedTopics.has('outliers') ? 'expanded' : ''}
                >
                  <td>
                    <strong>
                      <span style={{ marginRight: '8px' }}>
                        {expandedTopics.has('outliers') ? '▼' : '▶'}
                      </span>
                      Outliers
                    </strong>
                  </td>
                  <td>{outliersCount}</td>
                  <td style={{ fontStyle: 'italic', color: '#666' }}>
                    Documents that don't fit well into any topic
                  </td>
                </tr>
                {expandedTopics.has('outliers') && (
                  <tr className="documents-row">
                    <td colSpan="3">
                      <div className="documents-list">
                        <ul>
                          {outlierDocuments.map((doc, idx) => (
                            <li key={idx}>{doc}</li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function generateColors(count) {
  const colors = [
    '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
    '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf',
    '#aec7e8', '#ffbb78', '#98df8a', '#ff9896', '#c5b0d5',
    '#c49c94', '#f7b6d2', '#c7c7c7', '#dbdb8d', '#9edae5'
  ];
  
  if (count <= colors.length) {
    return colors.slice(0, count);
  }
  
  // Generate more colors if needed
  const additionalColors = [];
  for (let i = 0; i < count - colors.length; i++) {
    const hue = (i * 137.508) % 360; // Golden angle
    additionalColors.push(`hsl(${hue}, 70%, 50%)`);
  }
  
  return [...colors, ...additionalColors];
}

export default Visualizations;
