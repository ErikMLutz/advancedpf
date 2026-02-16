# Chart.js Demo

Simple hello-world Chart.js example to verify basic functionality.

## Purpose

This minimal demo helps isolate whether Chart.js issues are due to:
- CDN loading problems
- Browser compatibility
- Chart.js version issues
- Or more complex data processing in the main app

## Usage

```bash
just serve-demo
```

Then visit: http://localhost:8001/demo/

## What You Should See

A simple bar chart titled "World Wide Wine Production" with 5 colored bars representing wine production in different countries.

## Debugging Steps

1. **Open browser console** - Check for any errors
2. **Look for Chart.js version** - Should log "Chart.js version: 4.4.1"
3. **Inspect the canvas** - Should see rendered chart, not blank canvas

## If This Works But Main App Doesn't

The issue is likely in:
- Data loading/processing logic
- Alpine.js integration
- Chart configuration complexity
- Plugin interactions (colorschemes, etc)

## If This Doesn't Work

The issue is environmental:
- Browser compatibility
- Network/CDN access
- JavaScript execution blocked
