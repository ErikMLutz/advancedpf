# Finance Dashboard - Agent Context

> Concise guide for fresh agents working on this codebase

## CRITICAL Rules

- **Never commit unless explicitly instructed by the user**
- **Never read files in `data/`** — contains real financial data
- Add new charts at the bottom of the relevant section by default
- Use lowercase for all UI-facing text (chart labels, legend entries, axis ticks, tooltips) — exception: top-level section headers (e.g. "Net Worth", "Cash Flow", "Savings", "Taxes")
- Always use the theme's classified color scheme for all chart colors — never hardcode hex values. Available colors: `background`, `backgroundAlt`, `text`, `textSubtle`, `accent`, `accentAlt`, `chart1`–`chart5`, `chartWarn`, `chartAlarm`

## Overview

Personal finance dashboard web app that visualizes financial data from CSV files. Built with Alpine.js and Chart.js for simplicity. Prioritizes clean, maintainable code over pixel-perfect replication of the original Python version.

**Original**: Python/pandas/matplotlib (main.py)
**New**: HTML/JS/Alpine.js/Chart.js (web/)

## Architecture

```
Data Flow: CSV → dataLoader → dataProcessing → charts → display
           files    (parse)     (classes/fns)  (Chart.js) (Alpine)
```

### Key Files

**web/index.html**: Main page. Alpine.js `dashboard()` app — owns all state (`netWorthData`, `incomeData`, `savingsData`, etc.), `loadData()`, and `renderCharts()`. Also contains all chart canvas elements and section HTML.

**web/js/config.js**: Data file paths (`CONFIG.dataPaths`), chart defaults.

**web/js/themes.js**: Theme system. Each theme has a `palette` and a `mapping` of purpose-based names to palette colors. `getTheme(name)` returns resolved `classified` colors. Add new mapping keys here when introducing new semantic colors.

**web/js/dataLoader.js**: Loads all CSVs in parallel via Papa Parse. Parses dates, booleans. Returns `rawData` object.

**web/js/dataProcessing.js**: Core logic — `SnapshotData`, `EventData`, `computeValueOverLast12Months()`, `computeAssetAllocation()`, `computeSavingsAllocation()`, `categorizeAccount()`, and many more (see Key Functions below).

**web/js/chart-\*.js**: One file per chart. Each exports a single `create*Chart(canvasId, data, classified, ...)` function. Destroy previous chart instance before creating new one.

**justfile**: Task runner. Tasks: `serve`, `fetch-index-returns`, `generate-fake-data`, `load-real-data`, `save-real-data`, `generate-pdf`.
**scripts/**: Data management scripts:
- `fetch-all.py` — wrapper that calls all fetch scripts in sequence
- `fetch-index-returns.py` — Fetches S&P 500 annual returns → `web/data/sp500_returns.json`. Run by `just serve`.
- `fetch-position-info.py` — Fetches expense ratio + dividend yield per ticker from Yahoo Finance → `web/data/position_info.json`. Run by `just serve` and whenever `positions.csv` tickers change.
- `fetch-position-holdings.py` — Fetches underlying fund constituents + sector allocations → `web/data/position_holdings.json` and `web/data/position_sectors.json`.
- `fetch-budget-data.py` — Fetches stock prices for RSU/ESPP income → `web/data/budget.json`.
- `classify-theme.js` — Theme color classification utility (dev helper).
- `generate-fake-data.js` — Generates fake CSV data for development.
- `load-real-data.sh` / `save-real-data.sh` — Sync real data with 1Password.

## Data Model

### Data Files (in data/) — DO NOT READ

- **cash.csv, property.csv, debt.csv, securities.csv**: Snapshot data (`date, account, value`)
- **credit.csv**: Event data — transactions by date (`date, account, value`; spending is negative)
- **manifest.yaml**: Account metadata — YAML dict of accounts. Each key is an account name (matching `account` column in CSVs). Fields:
  - `type` — account type string, e.g. `cash`, `securities`, `property`, `debt`
  - `retirement` — boolean; marks account as a retirement account
  - `tax_treatment` — tax treatment for retirement accounts; known values: `roth ira`, `roth 401(k)`, `traditional ira`, `hsa`; defaults to `taxable` if omitted
  - `debt_applies_to` — for `type: debt` accounts, the name of the asset account this debt is linked to (used for netting)
  - `title` — optional display name override; falls back to the account key if absent
  - `primary_residence_since` — YYYY-MM-DD date when the property became a primary residence (inclusive)
  - `primary_residence_until` — YYYY-MM-DD date when it stopped being a primary residence (inclusive); omit if still current
  - `investment_since` — YYYY-MM-DD date when the property became an investment property (inclusive)
  - `investment_until` — YYYY-MM-DD date when it stopped being an investment property (inclusive); omit if still current
- **income.csv**: Annual income/tax breakdown (`year, total_income, federal_income_tax, state_income_tax, social_security, medicare`)
- **savings.csv**: Annual savings contributions (`year, account, amount`; negative = withdrawal)
- **positions.csv**: Point-in-time holdings (`date, account, position, value`). Infrequent snapshots; forward-filled. `position` is a ticker symbol (e.g. `FXAIX`).
- **cash_spending.csv**: Cash spending transactions used for budget baseline tracking (YTD actuals vs. target).

Generated data files (in `web/data/`, not committed):
- `sp500_returns.json` — Annual S&P 500 returns (from `fetch-index-returns.py`)
- `position_info.json` — Expense ratio + dividend yield per ticker (from `fetch-position-info.py`)
- `position_holdings.json` — Underlying fund constituents per position (from `fetch-position-holdings.py`)
- `position_sectors.json` — Sector allocations per position (from `fetch-position-holdings.py`)
- `budget.json` — Python-computed stock-price-dependent income values (from `fetch-budget-data.py`)

### Processing Classes

- **SnapshotData**: Point-in-time account values. Forward-fills missing months.
- **EventData**: Transaction/event records. Aggregates by month.

Both provide:
- `valueByMonth(months)`: Aggregate by month
- `valueByAccount()`: Current month by account
- `valueByAccountByMonth(months)`: (SnapshotData only) per-account values by month
- `changeByMonth(months)`: Month-over-month changes

### Key Functions

- **computePositionsData(rawPositions, manifest)**: Latest forward-filled value per (account, position); splits into `{ retirement, nonRetirement }` arrays of `{ label, value }` sorted by value descending.
- **computePositionsByAccount(rawPositions)**: Latest forward-filled value per (account, position) keyed by account.
- **computeValueOverLast12Months(sources)**: Combines sources, YoY comparison, 6-month rolling avg
- **computeSavingsAllocation(rows, manifest)**: Splits positive (savings) from negative (withdrawals) rows *before* aggregation. Returns `{ years, datasets, withdrawals }`.
- **computeAssetAllocation(sources, manifest)**: Asset breakdown by category for current month
- **computePortfolioPerformance(sources, manifest, savingsRows)**: Estimated yearly rate of return per investment category. Formula: (end − start − contributions) / |start|.
- **computeRetirementGrowth(sources, manifest, savingsRows)**: Cumulative contributions vs. total balance over time for retirement accounts.
- **computeRetirementTaxAllocation(sources, manifest)**: Current retirement account balances grouped by tax treatment (roth/traditional/hsa).
- **computeAccountsTable(sources, manifest, rawPositions)**: Current-month balance per account with metadata for the accounts table view.
- **computeUnderlyingPositions(positionsData, positionHoldings)**: Expands positions into their underlying fund constituents using `position_holdings.json`.
- **computeSectorPositions(positionsData, positionSectors)**: Aggregates position values by sector using `position_sectors.json`.
- **computeProgressHistory(rawData, manifest)**: Monthly aggregate snapshots for the ProjectionLab API integration.
- **categorizeAccount(account)**: Maps an account object `{type, retirement, primary_residence, investment_property}` → category string (e.g. `'retirement securities'`)
- **computeBudgetSavings(entries)**: Categorizes budget savings by account path → tax-treatment label
- **computeBudgetSpending(data)**: Normalizes baseline dict + discretionary array into `{ total, sections }`
- **computeBudgetTaxes(data, grossIncome)**: `expected_rate × grossIncome`
- **computeCashSpendingYTD(cashSpendingRows, year)**: Sums absolute spending values for a given calendar year from cash_spending.csv.
- **getAccountsWithMetadata(sources, manifest, currentMonthOnly, months)**: Returns accounts with manifest metadata applied and debts netted against linked assets.
- **forwardFill(data)**: Fills missing months with last known value
- **rollingAverage(values, window)**: Calculates trailing rolling average
- **rollingAverageCentered(values, window)**: Calculates centered rolling average

## Dashboard Sections & Charts

### Net Worth
- **all time** (`netWorthChart`): Line chart, full history

### Net Worth (last twelve months / asset allocation)
- **last twelve months** (`netWorth12MonthsChart`): Overlapping bars, YoY
- **asset allocation** (`assetAllocationChart`): Pie chart with datalabels

### Cash Flow
- **income** (`incomeChart`): Bar chart, annual totals
- **credit card spending** (`creditSpendingChart`): Mixed — bars + 2 trailing avg lines

### Savings
- **rate** (`savingsChart`): Stacked bar by category; withdrawals shown as separate negative bar (`chartWarn` color). Savings rate % label above each bar.

### Budget
- **income sankey** (`budgetIncomeSankeyChart`): Sankey diagram loaded from `data/budget.yaml` (JS) + `web/data/budget.json` (Python-computed stock-price-dependent income). Flows: income sources → gross income → savings → tax-treatment buckets; → taxes; → spending → baseline/discretionary → line items; → unaccounted. Overrun warning drawn via plugin when savings + spending + taxes > income.
- **progress** (`budgetProgressChart`): Horizontal stacked bar chart showing budget vs. actual spending per category for the current year.
- **baseline** (`budgetBaselineChart`): Line chart tracking cumulative YTD cash spending vs. target baseline over the course of the year.
- Budget data lives in `data/budget.yaml` (not committed). Python script `scripts/fetch-budget-data.py` only handles stock price fetches (RSU, ESPP); all other computation (savings, spending, taxes) is done in JS.
- `computeBudgetSavings(entries)`: categorizes savings by account path segments (hsa/401k/roth/ira → tax-treatment label).
- `computeBudgetSpending(data)`: handles flat dict (baseline) and `[{name, budget, value}]` array (discretionary); stores both `budget` and `spent` per item.
- `computeBudgetTaxes(data, grossIncome)`: `expected_rate × grossIncome`.
- Projected year bars: income chart shows dashed outline bar; savings chart shows dashed stacked bars for planned-remaining per category; taxes chart shows single dashed box for expected total. All use `afterDraw` plugin pattern — no extra datasets for income/taxes (avoids bar-width issues), extra datasets with `_projected` flag for savings stacks.

### Taxes
- **rate** (`taxesChart`): Stacked bar — federal / state / social security / medicare. Effective rate % label above each bar. Accepts optional `projectedTax` for dashed box overlay on budget year.

### Performance
- **net worth growth** (`netWorthGrowthChart`): Line chart, YoY % change by month + dashed 12-month moving avg. Starts 1 year after earliest net worth data.
- **portfolio performance** (`portfolioPerformanceChart`): Grouped bar chart by year. Estimated rate of return for `retirement securities`, `investment property`, `securities` vs. S&P 500 benchmark line. Formula: (end − start − contributions) / |start|. Investment property netted against linked debt.

### Retirement
- **growth** (`retirementGrowthChart`): Stacked area line chart showing cumulative contributions vs. total retirement balance over time.
- **tax allocation** (`retirementTaxAllocationChart`): Pie chart showing current retirement balance split by tax treatment (roth/traditional/hsa).

### Positions
- **positions**: Multi-view treemap system. `createPositionsChart()` renders to different canvases depending on context:
  - Interactive single-view mode: `positionsSingleChart` — toggles between overall/retirement/non-retirement/underlying/sectors views
  - Print/PDF mode (5 separate charts): `allPositionsChart`, `retirementPositionsChart`, `nonRetirementPositionsChart`, `positionsUnderlyingPrintChart`, `positionsSectorsPrintChart`
  - Sized by value; tooltip shows expense ratio and dividend yield from `web/data/position_info.json`
  - Underlying holdings use `web/data/position_holdings.json`; sector data uses `web/data/position_sectors.json`

## Common Tasks

### Add a New Chart

1. Create `web/js/chart-myChart.js` with a `createMyChart(canvasId, data, classified)` function
2. Add `<script src="js/chart-myChart.js"></script>` in `index.html` head
3. Add canvas + section HTML in `index.html` — **at the bottom of the relevant section**
4. Add state variable in `dashboard()` (e.g. `myChartData: null`)
5. Compute data in `loadData()`, store in state
6. Call `createMyChart(...)` in `renderCharts()`
7. Always use `classified.*` colors — never hardcode hex

### Modify Data Processing

1. Update logic in `web/js/dataProcessing.js`
2. Validate with `just serve` and check browser console

### Add a New Data Source

1. Add path to `CONFIG.dataPaths` in `config.js`
2. Add to `Promise.all` in `dataLoader.js` and include in return object
3. Process in `loadData()` in `index.html`

### Add a New Theme Color (semantic mapping)

1. Add the key to every theme's `mapping` in `themes.js`, picking a palette color
2. It will automatically be available as `classified.myNewKey` everywhere

### Debug Data Issues

1. Check browser console for validation warnings
2. `validateData()` in `dataLoader.js` checks manifest completeness
3. Common issue: account in CSV not in manifest.csv

## Theme / Color System

Defined in `web/js/themes.js`. Each theme has:
- `palette`: color families with shades 100–900
- `mapping`: purpose → `'family.shade'` (e.g. `'pacific_cyan.600'`)

`getTheme(name)` resolves the mapping into `classified` — a flat object of resolved hex values.

**Always use `classified.*` in chart files.** Never hardcode colors.

Semantic mapping keys:
| Key | Purpose |
|-----|---------|
| `background` / `backgroundAlt` | Chart/tooltip backgrounds |
| `text` / `textSubtle` | Labels, ticks, legend |
| `textDark` / `textDarkSubtle` | Labels for use on light backgrounds (defined in themes, currently unused in charts) |
| `accent` / `accentAlt` | UI highlights |
| `chart1`–`chart5` | Primary chart series colors |
| `chartWarn` | Notable callouts (e.g. withdrawals) |
| `chartAlarm` | Negative/critical values |

## Design Principles

**Simplicity**: Clean code > exact Python replication
**No Build**: All CDN, no webpack/babel/etc
**One file per chart**: Each `chart-*.js` is self-contained
**Lowercase UI text**: Chart labels, legends, tooltips — lowercase always (except section headers)
**Theme-aware**: All colors via `classified.*`, never hardcoded

## Edge Cases

**Missing months in data**: Forward-fill handles this (SnapshotData)
**Debt application**: Manifest's `debt_applies_to` links debt to assets
**Primary residence**: Takes precedence in categorization over property type
**Year boundaries**: Rolling avg may have nulls for first N-1 values
**Credit cards**: Excluded from net worth (tracked separately to avoid double-counting)
**Savings withdrawals**: Negative rows in savings.csv are split out *before* aggregation — they don't reduce the savings total, only appear as a negative bar

## Dependencies (CDN)

- Alpine.js 3.x: Reactivity
- Chart.js 4.x: Charts
- chartjs-plugin-datalabels: Labels on pie chart slices
- Papa Parse 5.x: CSV parsing
- html2canvas: Screenshot for PDF
- jsPDF: PDF generation

## Quick Start for New Agent

1. Read this file (you are here)
2. Read `web/index.html` — understand sections, state, `loadData()`, `renderCharts()`
3. Skim `web/js/dataProcessing.js` — understand data classes and key functions
4. Look at an existing `web/js/chart-*.js` for chart patterns
5. Validate changes: `just serve` and visit localhost:8000
