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

  // Function to fetch and parse RSS feed
  const fetchRSSFeed = async () => {
    setIsLoadingDefault(true);
    
    try {
      console.log('Fetching BBC World News...');
      
      const url = 'https://api.allorigins.win/get?url=' + encodeURIComponent('http://feeds.bbci.co.uk/news/world/rss.xml');
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(15000) // 15 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      let xmlText = await response.text();
      
      // Handle allorigins JSON response
      const jsonData = JSON.parse(xmlText);
      xmlText = jsonData.contents;
      
      // Parse XML
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parsing error');
      }
      
      // Extract items from RSS feed
      const items = xmlDoc.querySelectorAll('item');
      const documents = Array.from(items).map(item => {
        const title = item.querySelector('title')?.textContent || '';
        return title.trim();
      }).filter(doc => doc && doc.length > 0);
      
      if (documents.length > 0) {
        console.log(`✓ Successfully loaded ${documents.length} items from BBC World News`);
        onFileLoad(documents);
        setIsLoadingDefault(false);
        return;
      }
      
      throw new Error('No items found in feed');
      
    } catch (error) {
      console.log(`RSS feed error: ${error.message}, loading sample data instead`);
      loadSampleData();
      setIsLoadingDefault(false);
    }
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
      <p>Default: BBC World News headlines | Upload a text file with one title per line</p>
      
      <div className="upload-controls">
        <button 
          className="button"
          onClick={fetchRSSFeed}
          disabled={isProcessing || isLoadingDefault}
        >
          {isLoadingDefault ? 'Loading...' : 'Reload BBC News'}
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
