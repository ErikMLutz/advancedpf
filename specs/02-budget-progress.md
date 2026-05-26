# Budget Progress Charts

## Core Principle

No transaction-level accounting. Discretionary spending is tracked manually (spreadsheet → `value` fields in `budget.yaml`), and that's the only granularity we'll ever have. Charts work with totals and manually-entered actuals, not derived per-transaction figures.

---

## Budget Section Layout

The Budget section contains, in order:

```
Budget                              ← h2 ("Budget")
cashflow ($Xk gross)                ← text-xl subheader (gross income inline)

[Sankey chart — full width]

savings goals ($Xk / $Xk)          ← text-xl heading (side by side)
[savings progress chart]

discretionary spending goals ($Xk / $Xk)   ← text-xl heading (side by side)
[discretionary progress chart]

baseline spending goal ($Xk / $Xk)  ← text-xl heading (full width)
[baseline line chart]
```

The savings and discretionary progress charts sit side by side (flex row, each `flex:1`). The baseline chart is full width below.

---

## Savings Schema (`budget.yaml`)

Each savings entry now has `goal` (annual target) and `value` (YTD actual):

```yaml
savings:
  - account: /fidelity/roth 401k
    goal: 23000
    value: 15000
  - account: /fidelity/hsa
    goal: 8550
    value: 5700
  - account: /fidelity/taxable
    goal: 70000
    value: 42000
```

`computeBudgetSavings(entries)` categorizes by account path segments and aggregates into `by_category`:

```js
{
  total: <sum of value fields>,
  totalGoal: <sum of goal fields>,
  by_category: {
    "roth 401(k)": { goal: 23000, value: 15000 },
    "hsa":         { goal: 8550,  value: 5700  },
    "taxable":     { goal: 70000, value: 42000 },
  }
}
```

Path-segment categorization rules (applied to lowercased path split on `/`):
- Contains `hsa` → `hsa`
- Contains `401k` + `roth` → `roth 401(k)`
- Contains `401k` → `401(k)`
- Contains `ira` + `roth` → `roth ira`
- Contains `ira` → `ira`
- Otherwise → `taxable`

This schema change required updates in four places:
- `computeBudgetSavings` in `dataProcessing.js`
- `chart-budgetIncomeSankey.js` (uses `savings?.totalGoal ?? savings?.total`)
- `chart-savings.js` (uses `projectedSavings.by_category[cat]?.goal ?? ...`)
- `dashboard.js` (savings rows use `item.goal`/`item.value`; projected total uses `totalGoal`)

---

## Chart 1: Progress Charts (Savings + Discretionary)

Two separate horizontal bar charts rendered side by side via two calls to the same function:

```js
createBudgetProgressChart('budgetSavingsProgressChart',     savingsRows,  classified)
createBudgetProgressChart('budgetSpendingProgressChart',    spendingRows, classified)
```

**File**: `web/js/chart-budgetProgress.js`  
**Function**: `createBudgetProgressChart(canvasId, rows, classified)`

Uses `window[canvasId]` for instance tracking (so two instances can coexist).

### Row shape

```js
// Savings rows (from budgetData[year].savings.by_category):
{ label: "roth 401(k)", annualBudget: 23000, actual: 15000, type: 'savings' }

// Spending rows (from budgetData[year].spending.sections.discretionary.items):
{ label: "honeymoon", annualBudget: 8000, actual: 4387, type: 'discretionary' }
```

### Bar segments

Each row renders three stacked segments:
1. **spent** — actual, colored `classified.accent` (savings) or `classified.chart3` (discretionary)
2. **remaining** — `max(0, budget − actual)`, colored `classified.backgroundAlt`
3. **overrun** — `max(0, actual − budget)`, colored `classified.accent` (savings = good news) or `classified.chartWarn` (discretionary = overspent)

No prorating. Bars show actual vs annual budget.

### Labels and tooltip

- `afterDatasetsDraw` plugin draws `X%` at right edge of bar (`actual / annualBudget × 100`)
- Tooltip: `mode: 'index'`, only dataset 0 produces content (avoids duplicate lines for remaining/overrun segments)
- Tooltip shows: `spent: $Xk` and `annual budget: $Xk`

---

## Chart 2: Baseline Spending Tracker

**File**: `web/js/chart-budgetBaseline.js`  
**Function**: `createBudgetBaselineChart(canvasId, housingBudget, totalBudget, creditByMonth, cashByMonth, discretionaryActual, classified, budgetYear)`

### What it shows

A line chart with two series:
- **target** — dashed line (`classified.textSubtle`), straight from $0 to `totalBudget` across 12 months
- **actual** — solid line (`classified.accent`), cumulative monthly actual baseline spending; `null` for future months

### Baseline estimate formula (per month)

```
actual[m] = housing_cumulative[m] + credit_cumulative[m] + cash_cumulative[m] − discretionary_prorated[m]
```

Where:
- `housing_cumulative[m]` = `housingBudget / 12 × (m + 1)` — assumed paid evenly (fixed monthly cost)
- `credit_cumulative[m]` = sum of `creditByMonth[0..m]` (absolute values from `credit.csv`)
- `cash_cumulative[m]` = sum of `cashByMonth[0..m]` (absolute values from `cash_spending.csv`)
- `discretionary_prorated[m]` = `discretionaryActual × (m + 1) / (currentMonthIdx + 1)` — YTD total spread evenly across months with data

The subtraction of prorated discretionary removes the portion of credit/cash spending that is discretionary (already tracked separately), leaving the baseline estimate.

### Current month determination

```js
currentMonthIdx = today.getFullYear() > budgetYearInt ? 11       // past year: full year
                : today.getFullYear() < budgetYearInt ? -1       // future year: no data
                : today.getMonth()                                // current year: up to today
```

Months after `currentMonthIdx` are `null` in the actual dataset.

### Tooltip

Shows breakdown per month (actual series only):
```
credit: $Xk
cash: $Xk
housing: $Xk
− discretionary: $Xk
total: $Xk
```

### `budget.yaml` baseline schema

Baseline section uses array format (same as discretionary), with optional `is_credit` flag:

```yaml
spending:
  baseline:
    - name: housing
      budget: 31000
      # no value — assumed paid evenly (housingBudget / 12 per month)
    - name: other
      budget: 90000
      is_credit: true    # actual computed from credit.csv YTD — no manual entry
  discretionary:
    - name: honeymoon
      budget: 8000
      value: 4387
```

`computeBudgetSpending()` handles the array form for both sections. `is_credit: true` items get `spent: 0` initially; `dashboard.js` substitutes the real credit YTD after computing it from the raw EventData.

For backward compatibility, a flat-dict baseline is still supported (each entry becomes `{ budget: value, spent: value }`).

The chart uses only `housingBudget` (from `baseline.items['housing'].budget`) and `totalBudget` (sum of all baseline budgets). It does not use the per-item `spent` fields directly.

---

## `cash_spending.csv`

**Purpose**: catalogs rare large cash outlays (checks, Venmo, wires) for actual spending that would otherwise fall through the accounting.

**Format**: same as `credit.csv` — columns `date, account, value`, negative values for spending.

```csv
date,account,value
2026-03-15,contractor — kitchen renovation,-8500
2026-01-10,venmo — ski trip split,-340
```

**What goes here**: one-off cash payments for discretionary items (contractor checks, Venmo splits for tracked trips).

**What does NOT go here**: credit card bill payments (captured in `credit.csv`), mortgage/rent (captured as budget baseline items), transfers between own accounts, income deposits.

**Loading**: `CONFIG.dataPaths.cashSpending` → loaded as `EventData` in `dataLoader.js` → stored as `this.cashSpendingData` in `dashboard.js`.

`computeCashSpendingYTD(cashSpendingRows, year)` sums `Math.abs(value)` for rows in the given calendar year. Used for the baseline spending heading and stored as `budgetData[year].cashSpendingYTD`.

---

## Heading Calculations

| Heading | Formula |
|---------|---------|
| `cashflow ($Xk gross)` | `budgetData[yr].income.total` |
| `savings goals ($X/$X)` | `sum(by_category[*].value)` / `sum(by_category[*].goal)` |
| `discretionary spending goals ($X/$X)` | `sum(items[*].spent)` / `sum(items[*].budget)` for discretionary section |
| `baseline spending goal ($X/$X)` | `(creditYTD + cashSpendingYTD − discretionaryActual)` / `sum(baseline items[*].budget)` |
