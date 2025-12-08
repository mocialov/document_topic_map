"""Conference Map Visualization

This script creates interactive visualizations of conference topics using BERTopic and datamapplot.
"""

import os
os.environ["OMP_NUM_THREADS"] = "1"
os.environ["OPENBLAS_NUM_THREADS"] = "1"
os.environ["MKL_NUM_THREADS"] = "1"
os.environ["VECLIB_MAXIMUM_THREADS"] = "1"
os.environ["NUMEXPR_NUM_THREADS"] = "1"

from sentence_transformers import SentenceTransformer
from bertopic import BERTopic
from umap import UMAP
from sklearn.feature_extraction.text import CountVectorizer
from hdbscan import HDBSCAN
import datamapplot
from PIL import Image
import io
import plotly.graph_objects as go
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg
import ipywidgets as ipw
from ipywidgets.embed import embed_minimal_html
import numpy as np


def main():
    
    FILE_NAME = "titles"
    
    # Load documents
    docs = [item.rstrip("\n") for item in open(f"{FILE_NAME}.txt").readlines() if item != "\n"]
    
    print(f"Loaded {len(docs)} documents")
    
    # Create embeddings
    print("\nCreating embeddings...")
    sentence_model = SentenceTransformer("all-MiniLM-L6-v2")
    embeddings = sentence_model.encode(docs, show_progress_bar=True)
    
    # Reduce dimensions
    print("Reducing dimensions with UMAP...")
    # Use appropriate parameters for the dataset size
    n_neighbors = min(15, len(docs) - 1)
    umap_model = UMAP(
        n_neighbors=n_neighbors, 
        n_components=2, 
        min_dist=0.0, 
        metric='cosine',
        random_state=42,
        low_memory=True,
        n_jobs=1  # Force single-threaded
    )
    reduced_embeddings = umap_model.fit_transform(embeddings)
    
    # Train BERTopic with simple clustering
    print("Training BERTopic model...")
    
    # Simplified HDBSCAN
    hdbscan_model = HDBSCAN(
        min_cluster_size=max(2, len(docs) // 20),
        min_samples=1,
        metric='euclidean',
        cluster_selection_method='eom',
        core_dist_n_jobs=1
    )
    
    vectorizer_model = CountVectorizer(stop_words="english", min_df=1, max_df=0.95)
    
    # Create topic model - pass embeddings to fit instead of reduced_embeddings
    topic_model = BERTopic(
        umap_model=umap_model,
        hdbscan_model=hdbscan_model,
        vectorizer_model=vectorizer_model,
        verbose=True,
        calculate_probabilities=False
    )
    
    # Fit using original embeddings
    print("Fitting topic model...")
    topics, probs = topic_model.fit_transform(docs, embeddings)
    
    print(f"\nFound {len(set(topics))} topics")
    print(f"Topic distribution: {dict(zip(*np.unique(topics, return_counts=True)))}")
    
    # Create visualizations
    print("\nCreating visualizations...")
    
    try:
        # Document visualization
        print("Creating document visualization...")
        figure_doc = topic_model.visualize_documents(docs, reduced_embeddings=reduced_embeddings)
        
        # Hierarchical clustering
        print("Creating hierarchical clustering...")
        hierarchical_topics = topic_model.hierarchical_topics(docs)
        fig_hierarchical_clustering = topic_model.visualize_hierarchy(hierarchical_topics=hierarchical_topics)
        
        # Document datamap
        print("Creating document datamap...")
        figure_datamap = topic_model.visualize_document_datamap(docs, reduced_embeddings=reduced_embeddings)
        
        print("\nVisualization types:")
        print(f"figure_doc: {type(figure_doc)}")
        print("-" * 10)
        print(f"fig_hierarchical_clustering: {type(fig_hierarchical_clustering)}")
        print("-" * 10)
        print(f"figure_datamap: {type(figure_datamap)}")
        
        # Save visualizations separately
        print(f"Saving visualizations to HTML files...")
        
        # Save document visualization
        figure_doc.write_html(f"{FILE_NAME}_document.html")
        print(f"✓ Saved {FILE_NAME}_document.html")
        
        # Save hierarchical clustering
        fig_hierarchical_clustering.write_html(f"{FILE_NAME}_hierarchical.html")
        print(f"✓ Saved {FILE_NAME}_hierarchical.html")
        
        # Save datamap as PNG
        figure_datamap.savefig(f"{FILE_NAME}_datamap.png", dpi=150, bbox_inches='tight')
        print(f"✓ Saved {FILE_NAME}_datamap.png")
        
        print(f"\n✓ Successfully created all visualizations!")
        print(f"\nView the following files in your browser:")
        print(f"  - {FILE_NAME}_document.html (interactive document scatter plot)")
        print(f"  - {FILE_NAME}_hierarchical.html (hierarchical clustering dendrogram)")
        print(f"  - {FILE_NAME}_datamap.png (topic datamap)")
        
    except Exception as e:
        import traceback
        print(f"\n⚠ Error during visualization: {e}")
        print(f"Traceback:\n{traceback.format_exc()}")
        print("The model was trained successfully, but visualization failed.")
        print(f"\nTopics found:\n{topic_model.get_topic_info()}")
    print(f"Open the file in your browser to view the interactive visualizations.")


if __name__ == "__main__":
    main()
