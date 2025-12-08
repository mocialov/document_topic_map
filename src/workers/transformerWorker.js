/* eslint-disable no-restricted-globals */
// Web Worker for Transformers.js
// Runs model loading and inference off the main thread to prevent UI blocking

import { env, pipeline } from '@xenova/transformers';

// Let the library use its default configuration
// This is the most reliable approach for browser environments

let extractor = null;

// Configure model loading to prefer CDN (more reliable in GitHub Pages)
// Local models often fail to load properly in Web Workers due to path resolution issues
env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;

// Set CDN to HuggingFace (default, most reliable)
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

// Fix ONNX Runtime path issues in production builds
// ONNX Runtime tries to load worker scripts, and the paths get doubled in production
// We need to use the CDN version to avoid path resolution issues
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';

// Handle messages from main thread
self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    if (type === 'init') {
      // Initialize the model
      console.log('[Worker] Initializing Transformers.js model...');
      console.log('[Worker] Using default HuggingFace CDN settings');
      
      // Explicitly use the locally served model path to avoid any CDN/CORS issues
      // CRA serves files from `public`, so `/models/...` is accessible at runtime
      // Use the model id; env.localModelPath points to /models on the server
      extractor = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        {
          quantized: true,
          progress_callback: (progress) => {
            // Send progress updates back to main thread
            self.postMessage({
              type: 'progress',
              status: progress.status,
              file: progress.file,
              progress: progress.progress
            });
          }
        }
      );
      
      console.log('[Worker] Model loaded successfully');
      self.postMessage({ type: 'ready', success: true });
      
    } else if (type === 'embed') {
      // Generate embeddings for documents
      const { documents, batchSize = 8 } = data;
      
      if (!extractor) {
        throw new Error('Model not initialized. Call init first.');
      }
      
      console.log(`[Worker] Generating embeddings for ${documents.length} documents...`);
      const embeddings = [];
      
      // Process in batches
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, Math.min(i + batchSize, documents.length));
        
        // Generate embeddings
        const output = await extractor(batch, { 
          pooling: 'mean', 
          normalize: true 
        });
        
        // Extract embeddings from output
        for (let j = 0; j < batch.length; j++) {
          const embedding = Array.from(output[j].data);
          embeddings.push(embedding);
        }
        
        // Send progress update
        const processed = Math.min(i + batchSize, documents.length);
        self.postMessage({
          type: 'embed_progress',
          progress: processed / documents.length,
          processed,
          total: documents.length
        });
      }
      
      console.log(`[Worker] Generated ${embeddings.length} embeddings (${embeddings[0].length} dimensions)`);
      
      // Send results back
      self.postMessage({
        type: 'embed_complete',
        success: true,
        embeddings,
        dimensions: embeddings[0].length
      });
      
    } else {
      throw new Error(`Unknown message type: ${type}`);
    }
    
  } catch (error) {
    console.error('[Worker] Error:', error);
    console.error('[Worker] Error message:', error.message);
    console.error('[Worker] Error stack:', error.stack);
    
    // Try to get more details about the failed request
    if (error.message.includes('JSON')) {
      console.error('[Worker] This appears to be a model file fetch issue.');
      console.error('[Worker] The library is likely receiving HTML (404 page) instead of JSON.');
      console.error('[Worker] Check that the model exists at: https://huggingface.co/Xenova/all-MiniLM-L6-v2');
    }
    
    self.postMessage({
      type: 'error',
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
};
