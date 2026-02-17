#!/usr/bin/env bash

# Save edited financial data back to 1Password using op CLI

set -e

echo "Saving financial data to 1Password..."

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
echo "Source: $DATA_DIR"

# Sign in if needed
if ! op account get &> /dev/null; then
    echo "Signing in to 1Password..."
    eval $(op signin)
fi

# Create zip file of data directory with dated filename
echo "Creating zip archive..."
DATE_STAMP=$(date +%Y%m%d)
ZIP_FILENAME="advancedpf.${DATE_STAMP}.bak"
TMP_DIR=$(mktemp -d)
TMP_ZIP="${TMP_DIR}/${ZIP_FILENAME}"

cd "$DATA_DIR"
zip -r "$TMP_ZIP" *

cd - > /dev/null

echo "Zip created: $ZIP_FILENAME ($(du -h "$TMP_ZIP" | cut -f1))"

# Upload to 1Password (edit existing item or create new)
echo "Uploading to 1Password..."

# Check if item exists
if op item get "$ITEM_NAME" &> /dev/null 2>&1; then
    echo "Updating existing item..."

    # Edit the existing document with new content
    op document edit "$ITEM_NAME" "$TMP_ZIP"

    echo "✓ Updated existing item: $ITEM_NAME with $ZIP_FILENAME"
else
    echo "Creating new item..."

    # Create new document
    op document create "$TMP_ZIP" \
        --title "$ITEM_NAME" \
        --tags "finance,dashboard,data"

    echo "✓ Created new item: $ITEM_NAME with $ZIP_FILENAME"
fi

# Cleanup
rm -rf "$TMP_DIR"

echo "✓ Data saved to 1Password successfully!"
echo "Item: $ITEM_NAME"
