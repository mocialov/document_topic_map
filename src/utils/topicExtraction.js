// Topic extraction using c-TF-IDF with simple tokenization
// Works with semantic embeddings from transformers.js

const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'cannot', 'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'just', 'me', 'might', 'more', 'most', 'must', 'my', 'myself', 'no',
  'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'ourselves', 'out', 'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they',
  'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves',
  // Domain-specific stop words
  'using', 'via', 'based', 'new', 'novel', 'towards', 'efficient', 'effective', 'improved',
  'method', 'approach', 'framework', 'model', 'system', 'algorithm', 'technique', 'methods',
  'approaches', 'frameworks', 'models', 'systems', 'algorithms', 'techniques'
]);

/**
 * Tokenize and clean text
 * Since we're using semantic embeddings, we rely on simple unigram tokenization
 * The semantic understanding comes from the transformer model, not n-grams
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

/**
 * Extract important phrases (2-3 word sequences) from text
 * These help create more descriptive topic labels
 */
function extractPhrases(text) {
  const tokens = tokenize(text);
  const phrases = [];
  
  // Extract bigrams (2-word phrases)
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = tokens[i] + ' ' + tokens[i + 1];
    phrases.push(phrase);
  }
  
  // Extract trigrams (3-word phrases)
  for (let i = 0; i < tokens.length - 2; i++) {
    const phrase = tokens[i] + ' ' + tokens[i + 1] + ' ' + tokens[i + 2];
    phrases.push(phrase);
  }
  
  return phrases;
}

/**
 * Calculate c-TF-IDF (class-based TF-IDF) for cluster keyword extraction
 * This identifies terms that are distinctive to each cluster
 */
function calculateClassTFIDF(documents, clusterLabels) {
  const uniqueClusters = [...new Set(clusterLabels)].filter(c => c !== -1);
  const clusterScores = {};
  
  // Group documents by cluster
  const clusterDocs = {};
  uniqueClusters.forEach(clusterId => {
    clusterDocs[clusterId] = documents.filter((_, idx) => clusterLabels[idx] === clusterId);
  });
  
  // For each cluster, create a combined document
  const clusterTexts = {};
  uniqueClusters.forEach(clusterId => {
    clusterTexts[clusterId] = clusterDocs[clusterId].join(' ');
  });
  
  // Extract terms and phrases from cluster texts
  const clusterTerms = {};
  uniqueClusters.forEach(clusterId => {
    const text = clusterTexts[clusterId];
    const words = tokenize(text);
    const phrases = extractPhrases(text);
    clusterTerms[clusterId] = [...words, ...phrases];
  });
  
  // Calculate term frequency for each cluster
  const clusterTF = {};
  uniqueClusters.forEach(clusterId => {
    const terms = clusterTerms[clusterId];
    const tf = {};
    terms.forEach(term => {
      tf[term] = (tf[term] || 0) + 1;
    });
    clusterTF[clusterId] = tf;
  });
  
  // Calculate IDF: log(total clusters / clusters containing term)
  const allTerms = new Set();
  uniqueClusters.forEach(clusterId => {
    Object.keys(clusterTF[clusterId]).forEach(term => allTerms.add(term));
  });
  
  const idf = {};
  allTerms.forEach(term => {
    const clustersWithTerm = uniqueClusters.filter(
      clusterId => clusterTF[clusterId][term] > 0
    ).length;
    idf[term] = Math.log((uniqueClusters.length + 1) / (clustersWithTerm + 1));
  });
  
  // Calculate c-TF-IDF scores
  uniqueClusters.forEach(clusterId => {
    const scores = {};
    const totalTerms = clusterTerms[clusterId].length;
    
    Object.entries(clusterTF[clusterId]).forEach(([term, count]) => {
      const tf = count / totalTerms;
      
      // Boost multi-word phrases as they're more descriptive
      const wordCount = term.split(' ').length;
      let phraseBoost = 1.0;
      if (wordCount === 3) phraseBoost = 2.0;      // Trigrams
      else if (wordCount === 2) phraseBoost = 1.5; // Bigrams
      
      scores[term] = tf * idf[term] * phraseBoost;
    });
    
    clusterScores[clusterId] = scores;
  });
  
  return clusterScores;
}

/**
 * Extract top keywords for each cluster using c-TF-IDF
 */
export function extractTopicKeywords(documents, clusterLabels, topN = 10) {
  const uniqueClusters = [...new Set(clusterLabels)].filter(c => c !== -1);
  const topics = {};
  
  if (uniqueClusters.length === 0) {
    return topics;
  }
  
  // Use c-TF-IDF for better inter-cluster discrimination
  const clusterScores = calculateClassTFIDF(documents, clusterLabels);
  
  uniqueClusters.forEach(clusterId => {
    const scores = clusterScores[clusterId];
    
    // Sort by score and take top N
    const sortedTerms = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([term, score]) => ({ term, score }));
    
    topics[clusterId] = sortedTerms;
  });
  
  return topics;
}

/**
 * Generate topic labels from keywords with smarter formatting
 */
export function generateTopicLabels(topics) {
  const labels = {};
  
  Object.entries(topics).forEach(([clusterId, keywords]) => {
    if (keywords.length === 0) {
      labels[clusterId] = `Topic ${clusterId}: Empty`;
    } else {
      // Prioritize multi-word phrases for better labels
      const multiWordPhrases = keywords.filter(k => k.term.split(' ').length > 1);
      
      let topWords;
      if (multiWordPhrases.length >= 2) {
        // Use top 2 multi-word phrases if available
        topWords = multiWordPhrases.slice(0, 2).map(k => k.term).join(', ');
      } else if (multiWordPhrases.length === 1) {
        // Use 1 multi-word phrase + top single word
        const singleWords = keywords.filter(k => k.term.split(' ').length === 1);
        topWords = [multiWordPhrases[0].term, ...singleWords.slice(0, 1).map(k => k.term)].join(', ');
      } else {
        // Fallback to top 3 single words
        topWords = keywords.slice(0, 3).map(k => k.term).join(', ');
      }
      
      labels[clusterId] = `Topic ${clusterId}: ${topWords}`;
    }
  });
  
  // Add label for noise cluster if it exists
  labels[-1] = 'Outliers';
  
  return labels;
}

/**
 * Create a hierarchical structure from topics for dendrogram visualization
 */
export function createTopicHierarchy(topics, documents, clusterLabels, coordinates) {
  // Calculate cluster centroids
  const uniqueClusters = [...new Set(clusterLabels)].filter(c => c !== -1);
  const centroids = {};
  
  uniqueClusters.forEach(clusterId => {
    const clusterPoints = coordinates.filter((_, idx) => clusterLabels[idx] === clusterId);
    if (clusterPoints.length > 0) {
      const centroid = [
        clusterPoints.reduce((sum, p) => sum + p[0], 0) / clusterPoints.length,
        clusterPoints.reduce((sum, p) => sum + p[1], 0) / clusterPoints.length
      ];
      centroids[clusterId] = centroid;
    }
  });
  
  // Calculate distances between clusters
  const clusterIds = Object.keys(centroids).map(Number);
  const distances = [];
  
  for (let i = 0; i < clusterIds.length; i++) {
    for (let j = i + 1; j < clusterIds.length; j++) {
      const id1 = clusterIds[i];
      const id2 = clusterIds[j];
      const dist = euclideanDistance(centroids[id1], centroids[id2]);
      distances.push({ id1, id2, distance: dist });
    }
  }
  
  distances.sort((a, b) => a.distance - b.distance);
  
  return {
    centroids,
    distances,
    clusterIds
  };
}

function euclideanDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2)
  );
}
