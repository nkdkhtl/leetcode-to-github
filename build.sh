#!/bin/bash

# Build script for Leetcode to Github Extension
# This script creates a .zip file ready for submission to Firefox/Chrome stores

echo "🔨 Building Leetcode to Github Extension..."

# Remove old build if exists
rm -f leetcode-to-github.zip

# Create zip file with all necessary files
zip -r leetcode-to-github.zip \
  manifest.json \
  icon/ \
  popup/ \
  scripts/ \
  README.md \
  PRIVACY.md \
  -x "*.DS_Store" \
  -x "*/.git/*" \
  -x "*/node_modules/*" \
  -x "*.md~"

echo "✅ Build complete! File: leetcode-to-github.zip"
echo ""
echo "📦 Next steps:"
echo "  Firefox: Upload to https://addons.mozilla.org/developers/"
echo "  Chrome:  Upload to https://chrome.google.com/webstore/devconsole"
