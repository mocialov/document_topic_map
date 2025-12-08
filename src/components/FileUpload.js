import React, { useEffect, useState } from 'react';
import './FileUpload.css';

function FileUpload({ onFileLoad, isProcessing }) {
  const [isLoadingDefault, setIsLoadingDefault] = useState(false);

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
    onFileLoad(sampleTitles);
  };

  // Function to fetch and parse RSS feed with fallback to sample data
  const fetchRSSFeed = async () => {
    setIsLoadingDefault(true);
    
    // Try multiple RSS feeds and CORS proxies
    const feedConfigs = [
      {
        url: 'https://api.allorigins.win/get?url=' + encodeURIComponent('http://feeds.bbci.co.uk/news/world/rss.xml'),
        proxy: null,
        name: 'BBC World News',
        useGet: true
      },
      {
        url: 'http://feeds.bbci.co.uk/news/technology/rss.xml',
        proxy: 'https://api.codetabs.com/v1/proxy?quest=',
        name: 'BBC Technology'
      }
    ];
    
    for (const config of feedConfigs) {
      try {
        console.log(`Trying to fetch: ${config.name}...`);
        
        const fetchUrl = config.proxy ? `${config.proxy}${encodeURIComponent(config.url)}` : config.url;
        const response = await fetch(fetchUrl, { 
          signal: AbortSignal.timeout(8000) // 8 second timeout
        });
        
        if (!response.ok) {
          console.log(`${config.name} failed with HTTP ${response.status}`);
          continue;
        }
        
        let xmlText = await response.text();
        
        // Handle allorigins JSON response
        if (config.useGet) {
          try {
            const jsonData = JSON.parse(xmlText);
            xmlText = jsonData.contents;
          } catch (e) {
            // Not JSON, continue with xmlText as is
          }
        }
        
        // Parse XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
          console.log(`${config.name} XML parsing error`);
          continue;
        }
        
        // Extract items from RSS feed
        const items = xmlDoc.querySelectorAll('item');
        const documents = Array.from(items).map(item => {
          const title = item.querySelector('title')?.textContent || '';
          return title.trim();
        }).filter(doc => doc && doc.length > 0);
        
        if (documents.length > 0) {
          console.log(`✓ Successfully loaded ${documents.length} items from ${config.name}`);
          onFileLoad(documents);
          setIsLoadingDefault(false);
          return;
        }
      } catch (error) {
        console.log(`${config.name} error: ${error.message}`);
      }
    }
    
    // If all feeds failed, load sample data
    console.log('RSS feeds unavailable, loading sample conference titles instead');
    loadSampleData();
    setIsLoadingDefault(false);
  };

  // Load RSS feed on component mount
  useEffect(() => {
    fetchRSSFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const lines = text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      onFileLoad(lines);
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="file-upload">
      <h2>Upload Conference Titles</h2>
      <p>Default: Sample tech conference titles | Upload a text file with one title per line</p>
      
      <div className="upload-controls">
        <button 
          className="button"
          onClick={fetchRSSFeed}
          disabled={isProcessing || isLoadingDefault}
        >
          {isLoadingDefault ? 'Loading...' : 'Reload Sample Data'}
        </button>
        
        <button 
          className="button"
          onClick={loadSampleData}
          disabled={isProcessing || isLoadingDefault}
        >
          Load Sample Titles
        </button>
        
        <label className="file-input-label">
          <input 
            type="file" 
            accept=".txt"
            onChange={handleFileChange}
            disabled={isProcessing || isLoadingDefault}
          />
          <span className="button">Choose File</span>
        </label>
      </div>
    </div>
  );
}

export default FileUpload;
