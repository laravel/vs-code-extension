#!/bin/bash

set -e

echo "🚀 Laravel VS Code Extension Release"
echo "=========================================="

# Ensure we are on main and the working tree is clean
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: must be on main branch (current: $CURRENT_BRANCH)" >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes before releasing." >&2
  git status --porcelain
  exit 1
fi

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

gh release create "$new_version" --generate-notes

npx ovsx publish -p "$OPEN_VSX_ACCESS_TOKEN"

echo "\n✅ Release $new_version completed successfully."
echo "🔗 https://github.com/laravel/vs-code-extension/releases/tag/$new_version"
