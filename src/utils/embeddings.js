// Semantic text embeddings using Transformers.js via Web Worker (primary)
// If the worker fails on GitHub Pages due to importScripts/path issues,
// we fall back to a main-thread Transformers.js pipeline (secondary),
// and finally to TF-IDF (tertiary).
// Uses a lightweight BERT-based model for high-quality semantic understanding
// Web Worker ensures model loading doesn't block the UI thread

// Singleton pattern for the worker - initialize once and reuse
let worker = null;
let workerReady = false;
let useFallback = false;
let initPromise = null;

// Secondary fallback: main-thread transformers pipeline
import { env, pipeline } from '@xenova/transformers';
let extractor = null;
let extractorInit = null;

function configureTransformersEnv() {
  try {
    env.allowRemoteModels = true;
    env.allowLocalModels = false;
    env.useBrowserCache = true;
    env.remoteHost = 'https://huggingface.co';
    env.remotePathTemplate = '{model}/resolve/{revision}/';
    // Keep ONNX single-threaded
    if (env.backends?.onnx?.wasm) {
      env.backends.onnx.wasm.numThreads = 1;
      env.backends.onnx.wasm.proxy = false;
      env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.16.3/dist/';
      env.backends.onnx.wasm.wasmFile = 'ort-wasm.wasm';
      env.backends.onnx.wasm.workerFile = 'ort-wasm-worker.min.js';
    }
  } catch {}
}

async function initExtractor() {
  if (extractorInit) return extractorInit;
  extractorInit = (async () => {
    configureTransformersEnv();
    console.log('Initializing semantic model on main thread (worker fallback)...');
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
      quantized: true,
    });
    console.log('✓ Semantic model ready on main thread');
  })().catch(err => {
    console.error('Failed to init main-thread Transformers pipeline:', err);
    extractorInit = null;
    extractor = null;
    throw err;
  });
  return extractorInit;
}

/**
 * Initialize the Transformers.js Web Worker
 * Handles model loading off the main thread for better performance
 */
async function initWorker() {
  // Return existing initialization if in progress
  if (initPromise) {
    return initPromise;
  }
  
  // Don't re-initialize if already ready or using fallback
  if (workerReady || useFallback) {
    return;
  }
  
  initPromise = new Promise((resolve, reject) => {
    console.log('Loading semantic embedding model (this may take a minute on first load)...');
    console.log('Downloading from HuggingFace CDN...');
    
    try {
      // Create worker from the worker file
      worker = new Worker(
        new URL('../workers/transformerWorker.js', import.meta.url),
        { type: 'module' }
      );
      
      // Set up message handler
      worker.onmessage = (event) => {
        const { type, status, file, progress } = event.data;
        
        if (type === 'progress') {
          if (status === 'downloading') {
            const percent = progress ? Math.round(progress) : 0;
            console.log(`Downloading ${file}: ${percent}%`);
          } else if (status === 'done') {
            console.log(`✓ Downloaded ${file}`);
          } else if (status === 'ready') {
            console.log(`✓ Model ready: ${file}`);
          }
        } else if (type === 'ready') {
          console.log('✓ Semantic model loaded successfully in Web Worker');
          workerReady = true;
          initPromise = null;
          resolve();
        } else if (type === 'error') {
          console.error('Failed to load Transformers.js model:', event.data.error);
          console.error('Stack trace:', event.data.stack);
          console.warn('⚠️ Falling back to TF-IDF embeddings...');
          useFallback = true;
          workerReady = false;
          worker?.terminate();
          worker = null;
          initPromise = null;
          resolve(); // Resolve anyway to continue with fallback
        }
      };
      
      worker.onerror = (error) => {
        console.error('Worker error:', error);
        try {
          console.error('Worker filename:', error.filename);
          console.error('Worker lineno:', error.lineno, 'colno:', error.colno);
          console.error('Worker message:', error.message);
        } catch {}
        // Try secondary fallback: main-thread transformers
        (async () => {
          try {
            await initExtractor();
          } catch {
            console.warn('⚠️ Falling back to TF-IDF embeddings...');
            useFallback = true;
          }
          workerReady = false;
          worker?.terminate();
          worker = null;
          initPromise = null;
          resolve();
        })();
      };
      
      // Initialize the worker
      worker.postMessage({ type: 'init' });
      
    } catch (error) {
      console.error('Failed to create Web Worker:', error);
      console.warn('⚠️ Falling back to TF-IDF embeddings...');
      useFallback = true;
      initPromise = null;
      resolve(); // Resolve anyway to continue with fallback
    }
  });
  
  return initPromise;
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
    // Attempt main-thread transformers first
    try {
      await initExtractor();
      console.log('Generating semantic embeddings on main thread...');
      const output = await extractor(documents, { pooling: 'mean', normalize: true });
      const embeddings = output.map(t => Array.from(t.data));
      console.log(`✓ Generated ${embeddings.length} semantic embeddings (${embeddings[0].length} dimensions)`);
      return embeddings;
    } catch (err) {
      console.warn('Main-thread transformers failed, using TF-IDF:', err?.message || err);
      return generateTFIDFEmbeddings(documents, onProgress);
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

