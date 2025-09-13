#!/bin/bash

# TranslatorJHU Backend Launch Script
echo "🚀 Starting TranslatorJHU Backend..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please copy .env.example to .env and configure your API keys."
    echo "   cp .env.example .env"
    echo "   Then edit .env with your actual API keys."
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Start the server
echo "🌟 Starting server..."
npm start
