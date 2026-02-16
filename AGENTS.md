# Finance Dashboard - Agent Context

> Concise guide for fresh agents working on this codebase

## Overview

Personal finance dashboard web app that visualizes financial data from CSV files. Built with Alpine.js and Chart.js for simplicity. Prioritizes clean, maintainable code over pixel-perfect replication of the original Python version.

**Original**: Python/pandas/matplotlib (main.py)
**New**: HTML/JS/Alpine.js/Chart.js (web/)

## Architecture

```
Data Flow: CSV → dataLoader → dataProcessing → charts → display
           files    (parse)     (SnapshotData)  (Chart.js) (Alpine)
```

### Key Files

**web/index.html**: Main page, Alpine.js app, 6 chart containers + stats panel
**web/js/config.js**: Pinned colorschemes, data paths, settings
**web/js/dataLoader.js**: CSV loading (Papa Parse), data validation
**web/js/dataProcessing.js**: Core logic - SnapshotData/EventData classes, forward-fill, rolling averages
**web/js/charts.js**: All 6 Chart.js visualizations
**web/js/main.js**: Alpine.js orchestration, colorscheme switching, PDF export

**justfile**: Task runner (serve, test, generate-fake-data, load/save-real-data)
**scripts/**: Data management (generate fake data, 1Password sync)
**tests/**: Vitest tests for data processing logic

## Data Model

### CSV Files (in data/)
- **cash.csv, property.csv, debt.csv, securities.csv**: Snapshot data (date, account, value)
- **credit.csv**: Event data (transactions by date)
- **manifest.csv**: Account metadata (type, retirement, debt_applies_to, primary_residence)

### Processing Classes
- **SnapshotData**: Point-in-time account values. Forward-fills missing months.
- **EventData**: Transaction/event records. Aggregates by month.

Both provide:
- `valueByMonth(months)`: Aggregate by month
- `valueByAccount()`: Current month by account
- `changeByMonth(months)`: Month-over-month changes

### Key Functions
- **computeValueOverLast12Months(sources)**: Combines sources, calculates YoY comparison, 6-month rolling avg
- **forwardFill(data)**: Fills missing months with last known value
- **rollingAverage(values, window)**: Calculates rolling average
- **createMonthSkeleton(months)**: Generates YYYY-MM array

## Charts

1. **Monthly Movers**: Horizontal bar, month-over-month changes by source
2. **12-Month Net Worth**: Overlapping bars (this year vs last year)
3. **Stats Panel**: HTML div with key metrics (not a Chart.js chart)
4. **Credit Spending**: Mixed chart (bars + 2 line series for rolling avgs)
5. **Asset Categorization**: Stacked horizontal bar with categories
6. **All-Time Net Worth**: Line chart from 2013-09 to present

## Testing & Validation

### Primary (Token-Efficient)
```bash
just test          # Run Vitest tests
```
Tests in `tests/data-processing.test.js` validate core logic without browser.

### Secondary (Visual)
```bash
just serve         # Start server at localhost:8000
```
Then read http://localhost:8000 to verify HTML/charts rendered.

### Data Management
```bash
just generate-fake-data    # Create realistic sample data
just load-real-data        # Pull from 1Password (requires op CLI)
just save-real-data        # Push to 1Password
```

## Common Tasks

### Add a New Chart
1. Add canvas to `web/index.html`
2. Create chart function in `web/js/charts.js`
3. Call from `main.js` in `renderAllCharts()`
4. Pass colorscheme parameter for consistency

### Modify Data Processing
1. Update logic in `web/js/dataProcessing.js`
2. Add test in `tests/data-processing.test.js`
3. Run `just test` to validate
4. Serve app to visually verify

### Change Colorscheme
1. Add to `CONFIG.colorschemes` in `config.js`
2. Update dropdown in `index.html`
3. Colorscheme automatically applies to all charts via Chart.js plugin

### Debug Data Issues
1. Check browser console for validation warnings
2. `validateData()` in dataLoader.js checks manifest completeness
3. Common issue: account in CSV not in manifest.csv

## Design Principles

**Simplicity**: Clean code > exact Python replication
**Testability**: Write tests for data logic, run without browser
**Maintainability**: Clear functions, minimal dependencies
**No Build**: All CDN, no webpack/babel/etc
**Token-Efficient Validation**: Tests + reading served HTML

## PDF Export

Click "Export PDF" button or visit `?auto-export=true` for automatic export.
Uses html2canvas + jsPDF to capture dashboard as landscape A4.

```bash
just generate-pdf  # Opens browser with auto-export mode
```

## Colorscheme System

Uses chartjs-plugin-colorschemes (CDN). Available schemes in config.js.
Dropdown in UI switches all charts dynamically (Alpine.js reactivity).

Pinned favorites:
- **tableau.Tableau10**: Default (general use)
- **brewer.Dark2**: High contrast (PDF export)

## Edge Cases

**Missing months in data**: Forward-fill handles this (SnapshotData)
**Debt application**: Manifest's debt_applies_to links debt to assets
**Primary residence**: Takes precedence in categorization over property type
**Year boundaries**: Rolling avg may have nulls for first N-1 values
**Credit cards**: Excluded from net worth (tracked separately to avoid double-counting)

## Dependencies (CDN)

- Alpine.js 3.x: Reactivity
- Chart.js 4.x: Charts
- Papa Parse 5.x: CSV parsing
- date-fns 3.x: Date utilities
- html2canvas: Screenshot for PDF
- jsPDF: PDF generation
- chartjs-plugin-colorschemes: Color palettes

## Future Features

Prepared for but not yet implemented:
- Time range selection (skeleton generates 36 months, just need UI)
- Account filtering (data already grouped by account)
- Chart toggles (each chart in separate function)
- Real-time data updates (Alpine.js reactivity ready)

## Quick Start for New Agent

1. Read this file (you are here)
2. Read `web/index.html` to understand structure
3. Read `web/js/main.js` to understand data flow
4. Skim `web/js/dataProcessing.js` for core logic
5. Test with: `just serve` and visit localhost:8000
6. Validate changes with: `just test`
