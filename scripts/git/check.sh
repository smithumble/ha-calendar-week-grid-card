#!/bin/bash
# Check for changes in specified directory
# Usage: ./scripts/screenshots/check.sh <directory> [output_id]

set -e

readonly DIR="${1:-}"
readonly OUTPUT_ID="${2:-check}"

if [ -z "$DIR" ]; then
  echo "Error: Directory path required"
  echo "Usage: $0 <directory> [output_id]"
  exit 1
fi

if [ -n "$(git status --porcelain "$DIR")" ]; then
  if [ -n "$GITHUB_OUTPUT" ]; then
    echo "changed=true" >> "$GITHUB_OUTPUT"
  fi
  echo "Files changed in $DIR:"
  git status --porcelain "$DIR"
  echo ""
  git diff "$DIR" | cat
  exit 1
else
  if [ -n "$GITHUB_OUTPUT" ]; then
    echo "changed=false" >> "$GITHUB_OUTPUT"
  fi
  echo "No changes in $DIR"
fi
