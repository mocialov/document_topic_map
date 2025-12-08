// K-means clustering as a simpler alternative to HDBSCAN
import { kmeans } from 'ml-kmeans';

/**
 * Perform K-means clustering on 2D coordinates
 * @param {number[][]} coordinates - 2D coordinates from UMAP
 * @param {number} k - Number of clusters (auto-determined if not provided)
 * @returns {number[]} - Cluster assignments for each point
 */
export function clusterWithKMeans(coordinates, k = null) {
  // Auto-determine k using elbow method if not provided
  if (!k) {
    k = determineOptimalK(coordinates);
  }
  
  console.log(`Running K-means with ${k} clusters...`);
  
  const result = kmeans(coordinates, k, {
    initialization: 'kmeans++',
    maxIterations: 100
  });
  
  console.log('✓ Clustering complete');
  return result.clusters;
}

/**
 * Determine optimal number of clusters using elbow method
 * Modified to create more granular clusters
 */
function determineOptimalK(coordinates) {
  const n = coordinates.length;
  
  // Rules of thumb for k - adjusted for more granular clustering
  if (n < 10) return Math.min(3, Math.floor(n / 2));
  if (n < 50) return Math.min(8, Math.floor(n / 4));
  if (n < 200) return Math.min(15, Math.floor(Math.sqrt(n) * 1.5));
  
  // For larger datasets, use elbow method with higher k
  const maxK = Math.min(30, Math.floor(Math.sqrt(n)));
  const inertias = [];
  
  for (let k = 2; k <= maxK; k++) {
    const result = kmeans(coordinates, k, { 
      initialization: 'kmeans++',
      maxIterations: 50 
    });
    inertias.push(result.iterations[result.iterations.length - 1].error);
  }
  
  // Find elbow using rate of change
  let bestK = 2;
  let maxDelta = 0;
  
  for (let i = 1; i < inertias.length - 1; i++) {
    const delta = Math.abs(inertias[i] - inertias[i + 1]) - Math.abs(inertias[i - 1] - inertias[i]);
    if (delta > maxDelta) {
      maxDelta = delta;
      bestK = i + 2;
    }
  }
  
  // Bias towards more clusters - add 20% to the detected elbow
  bestK = Math.min(maxK, Math.floor(bestK * 1.2));
  
  console.log(`Auto-determined optimal k: ${bestK}`);
  return bestK;
}

/**
 * Density-based clustering (simplified DBSCAN alternative)
 * More similar to HDBSCAN behavior
 */
export function clusterWithDBSCAN(coordinates, eps = null, minPts = 2) {
  // Auto-determine eps using k-distance graph if not provided
  if (!eps) {
    eps = determineOptimalEps(coordinates, minPts);
  }
  
  console.log(`Running DBSCAN with eps=${eps}, minPts=${minPts}...`);
  
  const n = coordinates.length;
  const clusters = new Array(n).fill(-1); // -1 = noise/outlier
  let clusterId = 0;
  
  // Calculate distance matrix
  const distances = calculateDistanceMatrix(coordinates);
  
  for (let i = 0; i < n; i++) {
    if (clusters[i] !== -1) continue;
    
    const neighbors = findNeighbors(i, distances, eps);
    
    if (neighbors.length < minPts) {
      clusters[i] = -1; // Mark as noise
      continue;
    }
    
    // Start new cluster
    expandCluster(i, neighbors, clusterId, clusters, distances, eps, minPts);
    clusterId++;
  }
  
  console.log(`✓ DBSCAN complete: found ${clusterId} clusters`);
  return clusters;
}

function calculateDistanceMatrix(coordinates) {
  const n = coordinates.length;
  const distances = Array(n).fill(null).map(() => Array(n).fill(0));
  
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dist = euclideanDistance(coordinates[i], coordinates[j]);
      distances[i][j] = dist;
      distances[j][i] = dist;
    }
  }
  
  return distances;
}

function euclideanDistance(point1, point2) {
  return Math.sqrt(
    point1.reduce((sum, val, idx) => sum + Math.pow(val - point2[idx], 2), 0)
  );
}

function findNeighbors(pointIdx, distances, eps) {
  const neighbors = [];
  for (let i = 0; i < distances[pointIdx].length; i++) {
    if (distances[pointIdx][i] <= eps) {
      neighbors.push(i);
    }
  }
  return neighbors;
}

function expandCluster(pointIdx, neighbors, clusterId, clusters, distances, eps, minPts) {
  clusters[pointIdx] = clusterId;
  
  const queue = [...neighbors];
  
  while (queue.length > 0) {
    const current = queue.shift();
    
    if (clusters[current] === -1) {
      clusters[current] = clusterId;
    }
    
    if (clusters[current] !== -1) continue;
    
    clusters[current] = clusterId;
    
    const currentNeighbors = findNeighbors(current, distances, eps);
    
    if (currentNeighbors.length >= minPts) {
      queue.push(...currentNeighbors);
    }
  }
}

function determineOptimalEps(coordinates, minPts) {
  // Use k-distance graph approach
  const n = coordinates.length;
  const kDistances = [];
  
  for (let i = 0; i < n; i++) {
    const distances = [];
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        distances.push(euclideanDistance(coordinates[i], coordinates[j]));
      }
    }
    distances.sort((a, b) => a - b);
    kDistances.push(distances[Math.min(minPts - 1, distances.length - 1)]);
  }
  
  kDistances.sort((a, b) => a - b);
  
  // Use 70th percentile for smaller, more granular clusters (was 90th)
  const eps = kDistances[Math.floor(kDistances.length * 0.7)];
  console.log(`Auto-determined eps: ${eps}`);
  return eps * 0.85; // Further reduce by 15% for tighter clusters
}
