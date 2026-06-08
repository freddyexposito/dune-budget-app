#!/bin/bash
set -e

APP_DIR="/home/freddy/dune-budget-app"

echo "🚀 Deploying dune-budget..."

cd "$APP_DIR"

echo "📥 Pulling latest code..."
git pull

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building..."
npm run build

echo "♻️  Restarting app..."
pm2 restart dune-budget

echo "✅ Done! App is live."
pm2 list
