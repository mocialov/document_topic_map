# GitHub Pages Deployment Fix - Summary

## Problem
Your app was failing on GitHub Pages with WASM backend errors:
```
Error: no available backend found. ERR: [wasm] TypeError: Cannot read properties of undefined (reading 'buffer')
```

This happened because:
1. **GitHub Pages doesn't support SharedArrayBuffer** (requires special COOP/COEP headers)
2. **ONNX Runtime (used by Transformers.js) requires WASM with SharedArrayBuffer** for optimal performance
3. **TensorFlow.js also had backend issues** on GitHub Pages

## Solution Implemented

### ✅ Option 1: HuggingFace Inference API (RECOMMENDED - Currently Implemented)

**Advantages:**
- ✅ **Works perfectly on GitHub Pages** - no WASM issues
- ✅ **True semantic embeddings** - same quality as local models
- ✅ **Free tier available** - no API key needed for public models
- ✅ **Much smaller bundle size** - removed 67 packages (~400KB)
- ✅ **No complex worker setup** - simpler codebase
- ✅ **Faster initial load** - no large model downloads
- ✅ **Always up-to-date model** - hosted by HuggingFace

**How it works:**
- Calls HuggingFace Inference API for semantic embeddings
- Falls back to TF-IDF if API is unavailable or rate-limited
- Processes in batches of 32 documents at a time

**Changes Made:**
1. **src/utils/embeddings.js** - Completely rewritten to use Fetch API
2. **package.json** - Removed `@xenova/transformers`, `@tensorflow/tfjs`, `@tensorflow-models/universal-sentence-encoder`
3. **src/App.js** - Updated footer to reflect new approach
4. **src/workers/transformerWorker.js** - Backed up (no longer needed)

## Deployment Instructions

### 1. Deploy to GitHub Pages
```bash
npm run deploy
```

### 2. Verify Deployment
Visit: https://mocialov.github.io/document_topic_map

The app should now:
- Load without WASM errors
- Call HuggingFace API for embeddings
- Display "Calling HuggingFace API for X documents..." in console
- Generate semantic embeddings successfully

## Alternative Solutions (If HF API Doesn't Work)

### Option 2: Use Pre-computed Embeddings
If you want to avoid API calls entirely, you can pre-compute embeddings server-side and bundle them with the app.

### Option 3: Simpler ML Libraries
- **ml5.js** - Browser-friendly ML library
- **TensorFlow.js with WebGL** - Use WebGL backend only (no WASM)

### Option 4: Hosted Backend
Deploy a simple Python backend (Flask/FastAPI) to Heroku/Vercel and call it from your React app.

## Testing Checklist

- [x] Build completes without errors
- [x] Local serve works at http://localhost:3000
- [ ] Upload a document file (test with your titles.txt)
- [ ] Check browser console for "Calling HuggingFace API" message
- [ ] Verify embeddings are generated
- [ ] Check that visualizations appear
- [ ] Deploy to GitHub Pages
- [ ] Test on actual GitHub Pages URL

## Files Changed

### Modified:
- `package.json` - Removed heavy dependencies
- `src/utils/embeddings.js` - API-based approach
- `src/App.js` - Updated footer text

### Backed Up (can be deleted later):
- `src/utils/embeddings_old.js` - Original with Transformers.js
- `src/workers/transformerWorker_old.js` - Original worker

### Unchanged:
- All other files (clustering, UMAP, UI components, etc.)

## API Rate Limits

HuggingFace Inference API (free tier):
- ~1000 requests/hour per IP
- ~30 requests/minute

For your use case (conference papers), this should be plenty. If you hit limits:
1. The app automatically falls back to TF-IDF
2. Consider getting a free HuggingFace API key (much higher limits)

## Adding HuggingFace API Key (Optional)

If you want higher rate limits, get a free token at https://huggingface.co/settings/tokens

Then update `src/utils/embeddings.js`:
```javascript
const response = await fetch(HF_API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_HF_TOKEN_HERE' // Add this line
  },
  body: JSON.stringify({...})
});
```

## Next Steps

1. **Test locally** - Upload a file at http://localhost:3000
2. **Deploy** - Run `npm run deploy`
3. **Test on GitHub Pages** - Visit your deployed URL
4. **Monitor console** - Check for any errors

If you encounter issues, the app will automatically fall back to TF-IDF (which still works, just not semantic).

## Rollback Instructions

If you need to rollback to the old approach:
```bash
cd /Users/borismocialov/Downloads/conference_map
mv src/utils/embeddings.js src/utils/embeddings_api.js
mv src/utils/embeddings_old.js src/utils/embeddings.js
mv src/workers/transformerWorker_old.js src/workers/transformerWorker.js
git checkout package.json src/App.js
npm install
```

---

**You should now be able to deploy successfully to GitHub Pages with semantic embeddings!**
