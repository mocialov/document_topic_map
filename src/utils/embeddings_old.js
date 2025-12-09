/* eslint-disable import/first */
// Semantic text embeddings using HuggingFace Inference API
// This works reliably on GitHub Pages without WASM/CORS issues
// Falls back to TF-IDF if API is unavailable

// HuggingFace Inference API endpoint (free, no API key needed for public models)
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2';

let useFallback = false;


/**
 * Call HuggingFace Inference API for embeddings
 * Free tier, works on GitHub Pages without WASM issues
 */
async function getHFEmbeddings(texts, onProgress) {
  try {
    console.log(`Calling HuggingFace API for ${texts.length} documents...`);
    
    const embeddings = [];
    const batchSize = 32; // API can handle larger batches
    
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, Math.min(i + batchSize, texts.length));
      
      const response = await fetch(HF_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: batch,
          options: { wait_for_model: true }
        })
      });
      
      if (!response.ok) {
        throw new Error(`HuggingFace API error: ${response.status} ${response.statusText}`);
      }
      
      const batchEmbeddings = await response.json();
      embeddings.push(...batchEmbeddings);
      
      // Update progress
      const progress = Math.min(i + batchSize, texts.length) / texts.length;
      if (onProgress) onProgress(progress);
    }
    
    console.log(`✓ Generated ${embeddings.length} semantic embeddings from HuggingFace API`);
    return embeddings;
    
  } catch (error) {
    console.error('HuggingFace API failed:', error);
    throw error;
  }
}


// TF-IDF fallback implementation
const STOP_WORDS = new Set(['a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'if', 'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves']);

function tokenize(text) {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function generateTFIDFEmbeddings(documents, onProgress) {
  console.log('Using TF-IDF embeddings (fallback mode)');
  
  // Build vocabulary
  const vocab = new Set();
  documents.forEach(doc => tokenize(doc).forEach(token => vocab.add(token)));
  const vocabArray = Array.from(vocab).sort();
  
  // Calculate IDF
  const df = {};
  vocabArray.forEach(term => { df[term] = 0; });
  documents.forEach(doc => {
    const tokens = new Set(tokenize(doc));
    tokens.forEach(token => { if (df[token] !== undefined) df[token]++; });
  });
  
  const idf = {};
  const n = documents.length;
  vocabArray.forEach(term => {
    idf[term] = Math.log((n - df[term] + 0.5) / (df[term] + 0.5) + 1);
  });
  
  // Generate vectors
  const embeddings = documents.map((doc, idx) => {
    const tokens = tokenize(doc);
    const tf = {};
    tokens.forEach(token => { tf[token] = (tf[token] || 0) + 1; });
    
    const vector = vocabArray.map(term => {
      if (!tf[term]) return 0;
      return idf[term] * tf[term];
    });
    
    // Normalize
    const mag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    const normalized = mag > 0 ? vector.map(v => v / mag) : vector;
    
    if (onProgress) onProgress((idx + 1) / documents.length);
    return normalized;
  });
  
  console.log(`✓ Generated ${embeddings.length} TF-IDF embeddings (${embeddings[0].length} dimensions)`);
  return embeddings;
}

/**
 * Generate semantic embeddings for documents using Transformers.js
 * Provides deep semantic understanding of document meaning
 * Uses Web Worker to prevent blocking the UI thread
 */
export async function generateEmbeddings(documents, onProgress) {
  // Initialize worker (or confirm fallback mode)
  await initWorker();
  
  // Use fallback if worker initialization failed
  if (useFallback || !workerReady) {
    // Prefer USE on GitHub Pages (robust, browser-friendly)
    try {
      await initUSE();
      console.log('Generating semantic embeddings with USE...');
      const embeddingsTensor = await useModel.embed(documents);
      const embeddings = await embeddingsTensor.array();
      embeddingsTensor.dispose();
      console.log(`✓ Generated ${embeddings.length} USE embeddings (${embeddings[0].length} dimensions)`);
      return embeddings;
    } catch (err) {
      console.warn('USE failed, trying Transformers on main thread:', err?.message || err);
      try {
        await initExtractor();
        const output = await extractor(documents, { pooling: 'mean', normalize: true });
        const embeddings = output.map(t => Array.from(t.data));
        console.log(`✓ Generated ${embeddings.length} semantic embeddings (${embeddings[0].length} dimensions)`);
        return embeddings;
      } catch (err2) {
        console.warn('Main-thread transformers failed, using TF-IDF:', err2?.message || err2);
        return generateTFIDFEmbeddings(documents, onProgress);
      }
    }
  }
  
  console.log('Generating semantic embeddings with Transformers.js (Web Worker)...');
  
  // Create promise to handle worker response
  return new Promise((resolve, reject) => {
    // Set up one-time message handler for this embedding request
    const messageHandler = (event) => {
      const { type, embeddings, progress, processed, total, success, error } = event.data;
      
      if (type === 'embed_progress') {
        // Report progress
        if (onProgress) {
          onProgress(progress);
        }
        console.log(`Progress: ${processed}/${total} documents embedded`);
      } else if (type === 'embed_complete') {
        // Clean up handler
        worker.removeEventListener('message', messageHandler);
        
        if (success) {
          console.log(`✓ Generated ${embeddings.length} semantic embeddings (${embeddings[0].length} dimensions)`);
          resolve(embeddings);
        } else {
          console.error('Worker embedding failed:', error);
          console.warn('⚠️ Falling back to TF-IDF embeddings...');
          useFallback = true;
          resolve(generateTFIDFEmbeddings(documents, onProgress));
        }
      } else if (type === 'error') {
        // Clean up handler
        worker.removeEventListener('message', messageHandler);
        
        console.error('Worker error during embedding:', error);
        console.warn('⚠️ Falling back to TF-IDF embeddings...');
        useFallback = true;
        resolve(generateTFIDFEmbeddings(documents, onProgress));
      }
    };
    
    // Add message handler
    worker.addEventListener('message', messageHandler);
    
    // Send embedding request to worker
    worker.postMessage({
      type: 'embed',
      data: {
        documents,
        batchSize: 8
      }
    });
  });
}


/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  
  return dotProduct;
}

