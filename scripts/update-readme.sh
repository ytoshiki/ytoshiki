#!/bin/bash
set -e

echo "Configuring git..."
git config --local user.email "action@github.com"
git config --local user.name "GitHub Action"

echo "Checking for changes..."
if git diff --staged --quiet; then
  echo "No changes to commit"
  exit 0
fi

echo "Adding README.md..."
git add README.md

echo "Committing changes..."
git commit -m ":zap: Updates recent activity"

echo "Pushing to remote..."
git push

echo "✅ README updated successfully!"
