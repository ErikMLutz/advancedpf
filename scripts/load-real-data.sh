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

# Check for existing data and confirm deletion
if [ -d "$DATA_DIR" ] && ls "$DATA_DIR"/*.csv &> /dev/null; then
    echo ""
    echo "⚠️  Warning: data/ folder already exists with CSV files."
    echo "This will DELETE your existing financial data!"
    echo ""
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi

    # Delete existing data
    echo "Deleting existing data..."
    rm -rf "$DATA_DIR"
fi

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

# Extract to temporary directory first
echo "Extracting data..."
TMP_EXTRACT=$(mktemp -d)
unzip -o "$TMP_ZIP" -d "$TMP_EXTRACT"

# Check if zip contains a data/ folder or files directly
if [ -d "$TMP_EXTRACT/data" ]; then
    # Zip contains data/ folder, move its contents
    mkdir -p "$DATA_DIR"
    mv "$TMP_EXTRACT/data"/* "$DATA_DIR/"
else
    # Zip contains files directly, move them
    mkdir -p "$DATA_DIR"
    mv "$TMP_EXTRACT"/* "$DATA_DIR/"
fi

# Cleanup
rm -f "$TMP_ZIP"
rm -rf "$TMP_EXTRACT"

echo "✓ Real data loaded successfully!"
echo "Files in $DATA_DIR:"
ls -lh "$DATA_DIR"
