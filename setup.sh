#!/bin/bash

echo "🚀 Setting up Conference Map React Application..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js first:"
    echo "   https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Setup complete!"
    echo ""
    echo "To start the application:"
    echo "  npm start"
    echo ""
    echo "The app will open at http://localhost:3000"
    echo ""
    echo "📝 Note: On first run, the app will download a ~20MB ML model."
    echo "   This is cached for subsequent uses."
    echo ""
else
    echo ""
    echo "❌ Installation failed. Please check the errors above."
    exit 1
fi
