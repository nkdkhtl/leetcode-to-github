#!/bin/bash

# Build script for Leetcode to Github Extension
# This script creates a .zip file ready for submission to Firefox/Chrome stores

echo "🔨 Building Leetcode to Github Extension..."

# Remove old build if exists
rm -f leetcode-to-github.zip

# Build the file list dynamically to avoid failing on optional files.
FILES=(
  manifest.json
  icon
  popup
  scripts
  README.md
)

if [ -f "PRIVACY.md" ]; then
  FILES+=("PRIVACY.md")
else
  echo "⚠️  PRIVACY.md not found, skipping it."
fi

# Prefer zip; fallback to tar; then fallback to PowerShell Compress-Archive.
if command -v zip >/dev/null 2>&1; then
  zip -r leetcode-to-github.zip "${FILES[@]}" \
    -x "*.DS_Store" \
    -x "*/.git/*" \
    -x "*/node_modules/*" \
    -x "*.md~"
elif command -v tar >/dev/null 2>&1; then
  tar -a -c -f leetcode-to-github.zip "${FILES[@]}"
elif command -v powershell.exe >/dev/null 2>&1; then
  powershell.exe -NoProfile -Command "Compress-Archive -Path ${FILES[*]} -DestinationPath leetcode-to-github.zip -Force"
else
  echo "❌ No available archiver found (zip/tar/PowerShell)."
  exit 1
fi

if [ ! -f "leetcode-to-github.zip" ]; then
  echo "❌ Build failed: leetcode-to-github.zip was not created."
  exit 1
fi

echo "✅ Build complete! File: leetcode-to-github.zip"
echo ""
echo "📦 Next steps:"
echo "  Firefox: Upload to https://addons.mozilla.org/developers/"
echo "  Chrome:  Upload to https://chrome.google.com/webstore/devconsole"
