// Text embedding using BM25 - a proven TF-IDF variant
// This provides good semantic similarity without requiring external models

const K1 = 1.5;  // Term frequency saturation
const B = 0.75;  // Document length normalization

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
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));
}

function buildVocabulary(documents) {
  const vocab = new Set();
  documents.forEach(doc => {
    tokenize(doc).forEach(token => vocab.add(token));
  });
  return Array.from(vocab).sort();
}

function calculateIDF(documents, vocabulary) {
  const n = documents.length;
  const df = {};
  
  vocabulary.forEach(term => { df[term] = 0; });
  
  documents.forEach(doc => {
    const tokens = new Set(tokenize(doc));
    tokens.forEach(token => {
      if (df[token] !== undefined) df[token]++;
    });
  });
  
  const idf = {};
  vocabulary.forEach(term => {
    idf[term] = Math.log((n - df[term] + 0.5) / (df[term] + 0.5) + 1);
  });
  
  return idf;
}

function documentToVector(doc, vocabulary, idf, avgDocLength) {
  const tokens = tokenize(doc);
  const tf = {};
  
  tokens.forEach(token => {
    tf[token] = (tf[token] || 0) + 1;
  });
  
  const vector = new Array(vocabulary.length).fill(0);
  const docLength = tokens.length;
  
  vocabulary.forEach((term, idx) => {
    if (tf[term]) {
      const numerator = tf[term] * (K1 + 1);
      const denominator = tf[term] + K1 * (1 - B + B * (docLength / avgDocLength));
      vector[idx] = idf[term] * (numerator / denominator);
    }
  });
  
  // Normalize
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return magnitude > 0 ? vector.map(val => val / magnitude) : vector;
}

/**
 * Generate BM25 embeddings for documents
 * Fast, reliable, and works 100% offline
 */
export async function generateEmbeddings(documents, onProgress) {
  console.log('Generating BM25 embeddings...');
  
  const vocabulary = buildVocabulary(documents);
  console.log(`Vocabulary size: ${vocabulary.length} terms`);
  
  const idf = calculateIDF(documents, vocabulary);
  
  const avgDocLength = documents.reduce((sum, doc) => 
    sum + tokenize(doc).length, 0) / documents.length;
  
  const embeddings = [];
  for (let i = 0; i < documents.length; i++) {
    const vector = documentToVector(documents[i], vocabulary, idf, avgDocLength);
    embeddings.push(vector);
    
    if (onProgress) {
      onProgress((i + 1) / documents.length);
    }
  }
  
  console.log(`✓ Generated ${embeddings.length} BM25 embeddings`);
  return embeddings;
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

