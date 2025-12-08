# Conference Map Visualization

This project creates interactive visualizations of conference topics using BERTopic and datamapplot.

## Setup

### 1. Install uv (if not already installed)

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Add uv to your PATH

Add the following line to your shell configuration file (`~/.zshrc` for zsh or `~/.bash_profile` for bash):

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Then reload your shell:

```bash
source ~/.zshrc  # for zsh
# or
source ~/.bash_profile  # for bash
```

Alternatively, for the current session only:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

## Usage

Run the script with:

```bash
uv run # Conference Map Visualization - React Edition

A **100% client-side** conference topic visualization tool built entirely in React with **no backend or external APIs**. All machine learning operations run directly in your browser!

## 🎯 Features

- **Text Embeddings**: Uses [Transformers.js](https://huggingface.co/docs/transformers.js) to run ONNX models in the browser
- **Dimensionality Reduction**: UMAP algorithm via [umap-js](https://github.com/PAIR-code/umap-js)
- **Clustering**: K-Means and DBSCAN implementations for topic discovery
- **Topic Extraction**: Custom TF-IDF implementation for keyword extraction
- **Interactive Visualizations**: Plotly.js for beautiful, interactive charts
- **Privacy First**: All processing happens locally - no data leaves your browser!

## 🚀 How It Works

This application replicates the functionality of the Python BERTopic pipeline entirely in JavaScript:

1. **Embeddings**: Transformers.js runs the `all-MiniLM-L6-v2` model (same as Python version) using ONNX runtime in WebAssembly
2. **UMAP**: JavaScript implementation of UMAP reduces embeddings to 2D
3. **Clustering**: Choice of K-Means (fast, fixed clusters) or DBSCAN (density-based, auto-detects clusters)
4. **Topic Modeling**: Pure JavaScript TF-IDF implementation extracts keywords for each cluster
5. **Visualization**: Plotly creates interactive scatter plots and charts

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## 🎮 Usage

1. **Choose clustering method**: Select K-Means or DBSCAN
2. **Load data**: Upload a `.txt` file with one title per line, or use sample data
3. **Wait for processing**: The app will:
   - Load the ML model (~20MB, cached after first load)
   - Generate embeddings for your documents
   - Reduce dimensions with UMAP
   - Cluster similar documents
   - Extract topic keywords
4. **Explore visualizations**:
   - **Topic Map**: Interactive scatter plot of documents
   - **Topic Sizes**: Bar chart showing distribution
   - **Topic Keywords**: Table of extracted keywords per topic

## 📊 Visualizations

### Topic Map
Interactive scatter plot showing documents positioned by similarity. Documents in the same cluster share similar topics. Hover to see full titles.

### Topic Sizes
Bar chart displaying how many documents belong to each topic.

### Topic Keywords
Table showing the most relevant keywords for each topic, extracted using TF-IDF.

## 🛠️ Technical Stack

- **React 18**: UI framework
- **Transformers.js**: Browser-based transformer models (ONNX)
- **UMAP-JS**: Dimensionality reduction
- **ml-kmeans**: K-Means clustering
- **Plotly.js**: Interactive visualizations
- **Custom DBSCAN**: Density-based clustering implementation
- **Custom TF-IDF**: Topic keyword extraction

## 🔧 Performance Notes

- **First load**: Downloads ~20MB model (cached afterward)
- **Processing time**: Depends on document count
  - Small (10-50 docs): 10-30 seconds
  - Medium (50-200 docs): 30-90 seconds
  - Large (200+ docs): 1-3 minutes
- **Memory**: Requires decent amount of RAM (recommend 4GB+ available)

## 🆚 Differences from Python Version

| Feature | Python (BERTopic) | React (This App) |
|---------|------------------|------------------|
| Embeddings | sentence-transformers | Transformers.js (ONNX) |
| Clustering | HDBSCAN | K-Means or DBSCAN |
| UMAP | umap-learn | umap-js |
| Topic Extraction | c-TF-IDF | TF-IDF |
| Runs on | Server/local Python | Browser only |
| Privacy | Depends on setup | 100% private |

## 🎨 Customization

### Change number of clusters (K-Means)
Edit `src/utils/clustering.js` and modify the `determineOptimalK` function.

### Adjust UMAP parameters
Edit `src/utils/dimensionReduction.js` to tweak `nNeighbors`, `minDist`, etc.

### Change embedding model
Edit `src/utils/embeddings.js` and replace `'Xenova/all-MiniLM-L6-v2'` with any compatible model from [Hugging Face](https://huggingface.co/models?library=transformers.js).

## 📝 File Format

Upload a plain text file with one document/title per line:

```
Machine Learning Applications in Healthcare
Deep Learning for Image Recognition
Natural Language Processing Advances
Quantum Computing and Cryptography
```

## 🐛 Troubleshooting

### Model won't load
- Check internet connection (first load only)
- Clear browser cache and reload
- Try a different browser (Chrome/Edge recommended)

### Out of memory error
- Reduce number of documents
- Close other browser tabs
- Use a machine with more RAM

### Slow processing
- First run downloads the model (one-time ~20MB)
- Subsequent runs use cached model
- Consider reducing document count for faster results

## 🏗️ Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build/` folder that can be deployed to any static hosting service (Netlify, Vercel, GitHub Pages, etc.).

## 📄 License

MIT

## 🙏 Credits

Built with amazing open-source libraries:
- [Transformers.js](https://huggingface.co/docs/transformers.js) by Hugging Face
- [UMAP-JS](https://github.com/PAIR-code/umap-js) by Google PAIR
- [Plotly.js](https://plotly.com/javascript/)
- Inspired by [BERTopic](https://github.com/MaartenGr/BERTopic)

---

**Note**: This is a client-side implementation. For very large datasets (1000+ documents), consider the Python version for better performance_clean.py
```

This will:
1. Load conference titles from `titles.txt`
2. Create embeddings using sentence transformers
3. Perform dimensionality reduction with UMAP
4. Train a BERTopic model for topic modeling
5. Generate three visualization files:
   - `titles_document.html` - Interactive document scatter plot
   - `titles_hierarchical.html` - Hierarchical clustering dendrogram
   - `titles_datamap.png` - Topic datamap visualization

## Customizing the Input

Edit `titles.txt` to include your own conference titles or paper abstracts. Each line should contain one document.

## Dependencies

All dependencies are managed by `uv` and defined in `pyproject.toml`:
- bertopic
- sentence-transformers
- umap-learn
- datamapplot
- scikit-learn
- plotly
- matplotlib
- ipywidgets
- and more...

No need to manually install anything - `uv` handles it all automatically!

## Output Files

After running the script, open the HTML files in your web browser to explore the interactive visualizations.
