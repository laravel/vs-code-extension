#!/bin/bash

set -e

echo "🚀 Laravel VS Code Extension Release"
echo "=========================================="

BINARY_VERSION=`grep 'const binaryVersion' src/support/parser.ts | sed -E 's/.*"([^"]+)".*/\1/'`

read -p "Correct binary version (y/n)? $BINARY_VERSION " confirmation

if [ "$confirmation" != "y" ]; then
  echo "Please update the binary version in src/support/parser.ts"
  exit 1
fi

echo
echo "Current version: $(node -p "require('./package.json').version")"
echo

echo "Select version bump type:"
echo "1) patch (bug fixes)"
echo "2) minor (new features)"
echo "3) major (breaking changes)"
echo

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        version_type="patch"
        ;;
    2)
        version_type="minor"
        ;;
    3)
        version_type="major"
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo
echo "📦 Updating version to $version_type..."

new_version=$(npm version $version_type)
echo "✅ Version updated to $new_version"

echo
echo "📤 Pushing to repository..."
git push origin main --follow-tags

echo "✅ Pushed to repository"

echo
echo "🎉 Release $new_version is ready!"
echo
echo "📋 Opening GitHub release page..."

release_url="https://github.com/laravel/vs-code-extension/releases/new?tag=$new_version

open "$release_url"

echo
echo "🔗 Direct link to release page:"
echo "$release_url"
