#!/usr/bin/env bash

# Load real financial data from 1Password using op CLI

set -e

echo "Loading real financial data from 1Password..."

# Check if op CLI is installed
if ! command -v op &> /dev/null; then
    echo "Error: 1Password CLI (op) is not installed"
    echo "Install from: https://developer.1password.com/docs/cli/get-started/"
    exit 1
fi

# Configuration
ITEM_NAME="${ITEM_NAME:-AdvancedPF Data Backup}"
DATA_DIR="$(dirname "$0")/../data"

echo "Item: $ITEM_NAME"
echo "Destination: $DATA_DIR"

# Sign in if needed (will prompt if not authenticated)
if ! op account get &> /dev/null; then
    echo "Signing in to 1Password..."
    eval $(op signin)
fi

# Download the attachment (assumes data is stored as a zip file)
echo "Downloading data from 1Password..."
TMP_ZIP=$(mktemp -d)/finance-data.zip

op document get "$ITEM_NAME" --output "$TMP_ZIP"

if [ ! -f "$TMP_ZIP" ]; then
    echo "Error: Failed to download data from 1Password"
    exit 1
fi

# Extract to data directory
echo "Extracting data..."
mkdir -p "$DATA_DIR"
unzip -o "$TMP_ZIP" -d "$DATA_DIR"

# Cleanup
rm -f "$TMP_ZIP"

echo "✓ Real data loaded successfully!"
echo "Files in $DATA_DIR:"
ls -lh "$DATA_DIR"
