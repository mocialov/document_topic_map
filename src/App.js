import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ProgressBar from './components/ProgressBar';
import Visualizations from './components/Visualizations';
import { generateEmbeddings } from './utils/embeddings';
import { reduceWithUMAP } from './utils/dimensionReduction';
import { clusterWithKMeans, clusterWithDBSCAN } from './utils/clustering';
import { extractTopicKeywords, generateTopicLabels } from './utils/topicExtraction';
import './App.css';

function App() {
  const [documents, setDocuments] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [clusteringMethod, setClusteringMethod] = useState('dbscan');
  
  const handleFileLoad = async (docs) => {
    if (docs.length === 0) {
      alert('No valid documents found in file');
      return;
    }
    
    setDocuments(docs);
    setError(null);
    setIsProcessing(true);
    setResults(null);
    
    try {
      // Step 1: Generate embeddings
      setProgress({ stage: 'Generating embeddings', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const embeddings = await generateEmbeddings(docs, (p) => {
        setProgress({ stage: 'Generating embeddings', progress: p });
      });
      
      console.log(`✓ Generated ${embeddings.length} embeddings`);
      
      // Step 2: Reduce dimensions with UMAP
      setProgress({ stage: 'Reducing dimensions', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const coordinates = reduceWithUMAP(embeddings);
      setProgress({ stage: 'Reducing dimensions', progress: 1 });
      
      console.log(`✓ Reduced to ${coordinates.length} 2D coordinates`);
      
      // Step 3: Cluster documents
      setProgress({ stage: 'Clustering topics', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let clusters;
      if (clusteringMethod === 'kmeans') {
        clusters = clusterWithKMeans(coordinates);
      } else {
        clusters = clusterWithDBSCAN(coordinates);
      }
      
      setProgress({ stage: 'Clustering topics', progress: 1 });
      
      const uniqueClusters = [...new Set(clusters)];
      console.log(`✓ Found ${uniqueClusters.length} clusters`);
      
      // Reorder cluster IDs by size (largest gets ID 0)
      const clusterSizes = {};
      clusters.forEach(clusterId => {
        if (clusterId !== -1) {
          clusterSizes[clusterId] = (clusterSizes[clusterId] || 0) + 1;
        }
      });
      
      // Sort clusters by size (descending) and create mapping
      const sortedClusters = Object.entries(clusterSizes)
        .sort((a, b) => b[1] - a[1])
        .map(([clusterId]) => parseInt(clusterId));
      
      const clusterMapping = {};
      sortedClusters.forEach((oldId, newId) => {
        clusterMapping[oldId] = newId;
      });
      
      // Remap all cluster assignments
      clusters = clusters.map(clusterId => 
        clusterId === -1 ? -1 : clusterMapping[clusterId]
      );
      
      console.log(`✓ Reordered topics by document count`);
      
      // Step 4: Extract topic keywords
      setProgress({ stage: 'Extracting keywords', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const topics = extractTopicKeywords(docs, clusters);
      const topicLabels = generateTopicLabels(topics);
      
      setProgress({ stage: 'Extracting keywords', progress: 1 });
      
      console.log('✓ Extracted topic keywords');
      
      // Step 5: Create visualizations
      setProgress({ stage: 'Creating visualizations', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setResults({
        documents: docs,
        embeddings,
        coordinates,
        clusters,
        topics,
        topicLabels
      });
      
      setProgress({ stage: 'Creating visualizations', progress: 1 });
      
      console.log('✓ All processing complete!');
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'An error occurred during processing');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReset = () => {
    setDocuments(null);
    setResults(null);
    setError(null);
    setProgress({ stage: '', progress: 0 });
  };

  const handleReprocess = async (docs) => {
    if (docs.length === 0) {
      alert('No valid documents found');
      return;
    }
    
    setDocuments(docs);
    setError(null);
    setIsProcessing(true);
    // Keep results visible while reprocessing
    
    try {
      // Step 1: Generate embeddings
      setProgress({ stage: 'Generating embeddings', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      const embeddings = await generateEmbeddings(docs, (p) => {
        setProgress({ stage: 'Generating embeddings', progress: p });
      });
      
      console.log(`✓ Generated ${embeddings.length} embeddings`);
      
      // Step 2: Reduce dimensions with UMAP
      setProgress({ stage: 'Reducing dimensions', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const coordinates = reduceWithUMAP(embeddings);
      setProgress({ stage: 'Reducing dimensions', progress: 1 });
      
      console.log(`✓ Reduced to ${coordinates.length} 2D coordinates`);
      
      // Step 3: Cluster documents
      setProgress({ stage: 'Clustering topics', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let clusters;
      if (clusteringMethod === 'kmeans') {
        clusters = clusterWithKMeans(coordinates);
      } else {
        clusters = clusterWithDBSCAN(coordinates);
      }
      
      setProgress({ stage: 'Clustering topics', progress: 1 });
      
      const uniqueClusters = [...new Set(clusters)];
      console.log(`✓ Found ${uniqueClusters.length} clusters`);
      
      // Reorder cluster IDs by size (largest gets ID 0)
      const clusterSizes = {};
      clusters.forEach(clusterId => {
        if (clusterId !== -1) {
          clusterSizes[clusterId] = (clusterSizes[clusterId] || 0) + 1;
        }
      });
      
      // Sort clusters by size (descending) and create mapping
      const sortedClusters = Object.entries(clusterSizes)
        .sort((a, b) => b[1] - a[1])
        .map(([clusterId]) => parseInt(clusterId));
      
      const clusterMapping = {};
      sortedClusters.forEach((oldId, newId) => {
        clusterMapping[oldId] = newId;
      });
      
      // Remap all cluster assignments
      clusters = clusters.map(clusterId => 
        clusterId === -1 ? -1 : clusterMapping[clusterId]
      );
      
      console.log(`✓ Reordered topics by document count`);
      
      // Step 4: Extract topic keywords
      setProgress({ stage: 'Extracting keywords', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const topics = extractTopicKeywords(docs, clusters);
      const topicLabels = generateTopicLabels(topics);
      
      setProgress({ stage: 'Extracting keywords', progress: 1 });
      
      console.log('✓ Extracted topic keywords');
      
      // Step 5: Create visualizations
      setProgress({ stage: 'Creating visualizations', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setResults({
        documents: docs,
        embeddings,
        coordinates,
        clusters,
        topics,
        topicLabels
      });
      
      setProgress({ stage: 'Creating visualizations', progress: 1 });
      
      console.log('✓ All processing complete!');
      
    } catch (err) {
      console.error('Processing error:', err);
      setError(err.message || 'An error occurred during processing');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="App">
      <header className="app-header">
        <h1>Document Topic Map</h1>
      </header>
      
      <main className="app-main">
        {!documents && !results && (
          <>
            <div className="config-panel">
              <h3>Clustering Method</h3>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    value="kmeans"
                    checked={clusteringMethod === 'kmeans'}
                    onChange={(e) => setClusteringMethod(e.target.value)}
                    disabled={isProcessing}
                  />
                  <span>K-Means (Faster, Fixed Number of Clusters)</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    value="dbscan"
                    checked={clusteringMethod === 'dbscan'}
                    onChange={(e) => setClusteringMethod(e.target.value)}
                    disabled={isProcessing}
                  />
                  <span>DBSCAN (Density-Based, Auto-Detect Clusters)</span>
                </label>
              </div>
            </div>
            
            <FileUpload onFileLoad={handleFileLoad} isProcessing={isProcessing} />
          </>
        )}
        
        {isProcessing && !results && (
          <ProgressBar stage={progress.stage} progress={progress.progress} />
        )}
        
        {error && (
          <div className="error-panel">
            <h3>❌ Error</h3>
            <p>{error}</p>
            <button onClick={handleReset} className="button">
              Try Again
            </button>
          </div>
        )}
        
        {results && (
          <Visualizations 
            results={results} 
            onReprocess={handleReprocess} 
            isProcessing={isProcessing}
            progress={progress}
            clusteringMethod={clusteringMethod}
            setClusteringMethod={setClusteringMethod}
          />
        )}
      </main>
      
      <footer className="app-footer">
        <p>
          Powered by{' '}
          <a href="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2" target="_blank" rel="noopener noreferrer">
            HuggingFace Inference API
          </a>
          {' • '}
          <a href="https://github.com/PAIR-code/umap-js" target="_blank" rel="noopener noreferrer">
            UMAP-JS
          </a>
          {' • '}
          <a href="https://plotly.com/javascript/" target="_blank" rel="noopener noreferrer">
            Plotly.js
          </a>
        </p>
        <p className="tech-note">
          All processing happens in your browser - semantic embeddings via HuggingFace API!
        </p>
      </footer>
    </div>
  );
}

export default App;
