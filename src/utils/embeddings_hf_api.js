// Semantic text embeddings using HuggingFace Inference API
// This works reliably on GitHub Pages without WASM/CORS issues
// Falls back to TF-IDF if API is unavailable

// HuggingFace Inference API endpoint (free, no API key needed for public models)
// Updated to new router endpoint (Dec 2025)
const HF_API_URL = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

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
    
    const vector = new Array(vocabArray.length).fill(0);
    vocabArray.forEach((term, i) => {
      if (tf[term]) {
        vector[i] = tf[term] * idf[term];
      }
    });
    
    // Normalize
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    if (onProgress && idx % 10 === 0) {
      onProgress(idx / documents.length);
    }
    
    return vector;
  });
  
  console.log(`✓ Generated ${embeddings.length} TF-IDF embeddings (${embeddings[0].length} dimensions)`);
  return embeddings;
}

/**
 * Main function to generate embeddings for documents
 * Tries HuggingFace API first, falls back to TF-IDF if needed
 * 
 * @param {string[]} documents - Array of text documents
 * @param {function} onProgress - Progress callback (0 to 1)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddings(documents, onProgress = null) {
  if (!documents || documents.length === 0) {
    throw new Error('No documents provided');
  }
  
  try {
    // Try HuggingFace API first
    if (!useFallback) {
      try {
        const embeddings = await getHFEmbeddings(documents, onProgress);
        return embeddings;
      } catch (error) {
        console.error('HuggingFace API failed, falling back to TF-IDF:', error);
        useFallback = true;
      }
    }
    
    // Fall back to TF-IDF
    console.log('Using TF-IDF embeddings (fallback mode)');
    const embeddings = generateTFIDFEmbeddings(documents, onProgress);
    if (onProgress) onProgress(1);
    return embeddings;
    
  } catch (error) {
    console.error('Error generating embeddings:', error);
    throw error;
  }
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
