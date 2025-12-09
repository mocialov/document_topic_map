import React, { useState, useEffect } from 'react';
import Visualizations from './components/Visualizations';
import AboutModal from './components/AboutModal';
import { generateEmbeddings } from './utils/embeddings';
import { reduceWithUMAP } from './utils/dimensionReduction';
import { clusterWithKMeans, clusterWithDBSCAN } from './utils/clustering';
import { extractTopicKeywords, generateTopicLabels } from './utils/topicExtraction';
import './App.css';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', progress: 0 });
  const [results, setResults] = useState({
    documents: ['Loading news headlines...'],
    embeddings: [],
    coordinates: [[0, 0]],
    clusters: [0],
    topics: { 0: [] },
    topicLabels: { 0: 'Loading...' }
  });
  const [error, setError] = useState(null);
  const [clusteringMethod, setClusteringMethod] = useState('dbscan');
  const [showAbout, setShowAbout] = useState(false);
  
  // Function to fetch and parse BBC RSS feed with retry logic
  const fetchRSSFeed = async () => {
    const rssUrl = 'https://feeds.bbci.co.uk/news/world/rss.xml';
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Fetching BBC World News RSS feed (attempt ${attempt}/${maxRetries})...`);
        
        // Use JSON endpoint for more reliability
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`;
        
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout per attempt
        
        const response = await fetch(proxyUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Check if the proxy returned the content
        if (!data.contents) {
          throw new Error('No contents in proxy response');
        }
        
        const xmlText = data.contents;
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          throw new Error('XML parsing error');
        }
        
        // Extract titles from RSS items
        const items = xmlDoc.querySelectorAll('item');
        const allDocs = Array.from(items)
          .map(item => {
            const titleElement = item.querySelector('title');
            return titleElement ? titleElement.textContent.trim() : '';
          })
          .filter(title => title.length > 0);
        
        if (allDocs.length > 0) {
          console.log(`✓ Successfully loaded ${allDocs.length} BBC news headlines`);
          handleFileLoad(allDocs);
          return;
        }
        
        throw new Error('No items found in RSS feed');
        
      } catch (error) {
        console.error(`BBC RSS fetch attempt ${attempt} failed:`, error.message);
        
        // If this was the last attempt, load sample data
        if (attempt === maxRetries) {
          console.log(`All ${maxRetries} attempts failed, loading sample data instead`);
          loadSampleData();
        } else {
          // Wait before retrying (exponential backoff: 1s, 2s)
          const waitTime = attempt * 1000;
          console.log(`Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
  };
  
  // Sample data as fallback
  const loadSampleData = () => {
    const sampleTitles = [
      "Advances in Machine Learning for Natural Language Processing",
      "Quantum Computing Applications in Cryptography",
      "Sustainable Energy Solutions and Climate Change",
      "CRISPR Gene Editing: Medical Breakthroughs and Ethical Considerations",
      "Blockchain Technology Beyond Cryptocurrency",
      "Artificial Intelligence in Healthcare Diagnostics",
      "5G Networks and Internet of Things Integration",
      "Autonomous Vehicles: Safety and Regulation Challenges",
      "Augmented Reality in Education and Training",
      "Cybersecurity Threats in Cloud Computing",
      "Deep Learning for Computer Vision Applications",
      "Renewable Energy Storage Technologies",
      "Neuromorphic Computing and Brain-Inspired AI",
      "Personalized Medicine Through Genomic Analysis",
      "Smart Cities and Urban Planning Technologies",
      "Virtual Reality Therapy for Mental Health",
      "Edge Computing and Real-Time Data Processing",
      "Biometric Authentication Systems and Privacy",
      "Nanotechnology in Drug Delivery Systems",
      "Explainable AI and Algorithmic Transparency",
      "Robotic Process Automation in Business",
      "Carbon Capture and Storage Technologies",
      "Federated Learning for Privacy-Preserving AI",
      "Precision Agriculture Using Satellite Imagery",
      "Brain-Computer Interfaces for Assistive Technology",
      "Synthetic Biology and Bioengineering",
      "Digital Twins in Manufacturing",
      "Natural Language Generation and Content Creation",
      "Microservices Architecture in Cloud Applications",
      "Biodegradable Plastics and Environmental Impact"
    ];
    
    console.log(`✓ Loaded ${sampleTitles.length} sample conference titles`);
    handleFileLoad(sampleTitles);
  };
  
  // Load RSS feed on component mount
  useEffect(() => {
    fetchRSSFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const handleFileLoad = async (docs) => {
    if (docs.length === 0) {
      alert('No valid documents found in file');
      return;
    }
    
    setError(null);
    setIsProcessing(true);
    
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

  const handleReprocess = async (docs) => {
    if (docs.length === 0) {
      alert('No valid documents found');
      return;
    }
    
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
        <button className="about-button" onClick={() => setShowAbout(true)}>
          ℹ️ About
        </button>
      </header>
      
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />
      
      <main className="app-main">
        {error && (
          <div className="error-panel">
            <h3>❌ Error</h3>
            <p>{error}</p>
            <button onClick={fetchRSSFeed} className="button">
              Reload News
            </button>
          </div>
        )}
        
        <Visualizations 
          results={results} 
          onReprocess={handleReprocess} 
          isProcessing={isProcessing}
          progress={progress}
          clusteringMethod={clusteringMethod}
          setClusteringMethod={setClusteringMethod}
        />
      </main>
      
      <footer className="app-footer">
        <p>
          Powered by{' '}
          <a href="https://www.tensorflow.org/js" target="_blank" rel="noopener noreferrer">
            TensorFlow.js
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
          All processing happens in your browser - semantic embeddings via Universal Sentence Encoder!
        </p>
      </footer>
    </div>
  );
}

export default App;
