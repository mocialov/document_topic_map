#!/bin/bash

# Conference Map Runner
# This script ensures uv is in the PATH and runs the visualization script

# Add uv to PATH if not already there
export PATH="$HOME/.local/bin:$PATH"

# Check if uv is installed
if ! command -v uv &> /dev/null; then
    echo "Error: uv is not installed."
    echo "Install it with: curl -LsSf https://astral.sh/uv/install.sh | sh"
    exit 1
fi

# Run the conference map script
echo "Running conference map visualization..."
uv run conference_map_clean.py

echo ""
echo "Done! Check the generated HTML files in your browser."
