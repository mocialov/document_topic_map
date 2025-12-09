import React from 'react';
import './AboutModal.css';

function AboutModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        
        <h2>About Document Topic Map</h2>
        
        <section className="about-section">
          <h3>🎯 What This App Does</h3>
          <p>
            Document Topic Map analyzes collections of text documents (like conference paper titles) 
            and automatically groups them into topics based on semantic meaning. It creates interactive 
            visualizations showing how documents cluster together and what topics emerge from your data.
          </p>
        </section>

        <section className="about-section">
          <h3>🔬 How It Works</h3>
          <ol>
            <li>
              <strong>Semantic Embeddings:</strong> Each document is converted into a high-dimensional 
              vector (embedding) that captures its semantic meaning using the Universal Sentence Encoder.
            </li>
            <li>
              <strong>Dimensionality Reduction:</strong> UMAP reduces these high-dimensional embeddings 
              to 2D coordinates while preserving the semantic relationships between documents.
            </li>
            <li>
              <strong>Clustering:</strong> Documents are grouped into topics using either K-Means or 
              DBSCAN clustering algorithms based on their proximity in embedding space.
            </li>
            <li>
              <strong>Keyword Extraction:</strong> TF-IDF analysis identifies the most important words 
              for each topic to generate descriptive labels.
            </li>
          </ol>
        </section>

        <section className="about-section">
          <h3>🛠️ Technologies Used</h3>
          <ul className="tech-list">
            <li>
              <strong>TensorFlow.js + Universal Sentence Encoder:</strong> Generates semantic embeddings 
              using a pre-trained neural network that runs entirely in your browser via WebGL.
            </li>
            <li>
              <strong>UMAP-JS:</strong> Uniform Manifold Approximation and Projection algorithm for 
              dimensionality reduction, preserving local and global structure.
            </li>
            <li>
              <strong>K-Means & DBSCAN:</strong> Two clustering approaches - K-Means for fixed cluster 
              counts, DBSCAN for density-based automatic cluster detection.
            </li>
            <li>
              <strong>Plotly.js:</strong> Interactive visualizations with zoom, pan, and hover features.
            </li>
            <li>
              <strong>React:</strong> Modern component-based UI framework for smooth user interactions.
            </li>
          </ul>
        </section>

        <section className="about-section">
          <h3>🔒 Privacy & Performance</h3>
          <p>
            <strong>100% Client-Side Processing:</strong> All analysis happens entirely in your browser. 
            Your documents never leave your device - no data is sent to any server. The semantic model 
            is loaded once and cached for future use.
          </p>
        </section>

        <section className="about-section">
          <h3>💡 Tips</h3>
          <ul>
            <li>Works best with 50-500 documents</li>
            <li>DBSCAN automatically detects the number of topics</li>
            <li>K-Means is faster and creates evenly-sized clusters</li>
            <li>The model loads on first use (may take 10-30 seconds)</li>
            <li>Click points in the visualization to see document details</li>
          </ul>
        </section>

        <div className="modal-footer">
          <p>
            <a href="https://github.com/mocialov/document_topic_map" target="_blank" rel="noopener noreferrer">
              View on GitHub
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AboutModal;
