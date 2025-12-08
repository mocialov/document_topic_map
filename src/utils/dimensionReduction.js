// UMAP dimensionality reduction using umap-js
import { UMAP } from 'umap-js';

/**
 * Reduce embeddings to 2D using UMAP
 * @param {number[][]} embeddings - High-dimensional embeddings
 * @param {Object} options - UMAP parameters
 * @returns {number[][]} - 2D coordinates
 */
export function reduceWithUMAP(embeddings, options = {}) {
  const {
    nNeighbors = Math.min(15, embeddings.length - 1),
    nComponents = 2,
    minDist = 0.3,  // Increased from 0.0 for better local separation
    spread = 0.8,   // Reduced from 1.0 for tighter, more distinct clusters
    randomState = 42
  } = options;
  
  console.log('Running UMAP with parameters:', {
    nNeighbors,
    nComponents,
    minDist,
    spread
  });
  
  let seed = randomState;
  
  const umap = new UMAP({
    nNeighbors,
    nComponents,
    minDist,
    spread,
    random: () => {
      // Seeded random for reproducibility
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    }
  });
  
  const reducedEmbeddings = umap.fit(embeddings);
  
  console.log('✓ UMAP reduction complete');
  return reducedEmbeddings;
}

/**
 * Normalize coordinates to [0, 1] range for better visualization
 */
export function normalizeCoordinates(coordinates) {
  const xValues = coordinates.map(c => c[0]);
  const yValues = coordinates.map(c => c[1]);
  
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  
  return coordinates.map(([x, y]) => [
    (x - xMin) / (xMax - xMin),
    (y - yMin) / (yMax - yMin)
  ]);
}
