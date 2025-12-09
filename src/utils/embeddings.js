// Semantic text embeddings using TensorFlow.js Universal Sentence Encoder
// Uses WebGL backend which works reliably on GitHub Pages (no SharedArrayBuffer needed)

import * as tf from '@tensorflow/tfjs';
import * as use from '@tensorflow-models/universal-sentence-encoder';

let model = null;
let modelLoading = null;

/**
 * Initialize Universal Sentence Encoder with WebGL backend
 * WebGL works on GitHub Pages without special headers
 */
async function initUSE() {
  if (model) return model;
  if (modelLoading) return modelLoading;
  
  modelLoading = (async () => {
    console.log('Initializing Universal Sentence Encoder (TensorFlow.js)...');
    console.log('Using WebGL backend for GitHub Pages compatibility...');
    
    // Set backend to WebGL explicitly (avoids WASM issues)
    await tf.setBackend('webgl');
    await tf.ready();
    
    console.log(`✓ TensorFlow.js backend: ${tf.getBackend()}`);
    
    // Load Universal Sentence Encoder
    model = await use.load();
    
    console.log('✓ Universal Sentence Encoder loaded successfully');
    modelLoading = null;
    return model;
  })();
  
  return modelLoading;
}

/**
 * Generate embeddings for documents using Universal Sentence Encoder
 * 
 * @param {string[]} documents - Array of text documents
 * @param {function} onProgress - Progress callback (0 to 1)
 * @returns {Promise<number[][]>} - Array of embedding vectors
 */
export async function generateEmbeddings(documents, onProgress = null) {
  if (!documents || documents.length === 0) {
    throw new Error('No documents provided');
  }
  
  const useModel = await initUSE();
  
  console.log(`Generating semantic embeddings for ${documents.length} documents...`);
  
  // Process in batches to show progress
  const batchSize = 50;
  const allEmbeddings = [];
  
  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, Math.min(i + batchSize, documents.length));
    
    // Generate embeddings
    const embeddingsTensor = await useModel.embed(batch);
    const batchEmbeddings = await embeddingsTensor.array();
    embeddingsTensor.dispose(); // Clean up tensor
    
    allEmbeddings.push(...batchEmbeddings);
    
    // Update progress
    const progress = Math.min(i + batchSize, documents.length) / documents.length;
    if (onProgress) onProgress(progress);
  }
  
  console.log(`✓ Generated ${allEmbeddings.length} USE embeddings (${allEmbeddings[0].length} dimensions)`);
  return allEmbeddings;
}

/**
 * Calculate cosine similarity between two vectors
 * USE embeddings are already normalized, so dot product = cosine similarity
 */
export function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
  }
  return dotProduct;
}
