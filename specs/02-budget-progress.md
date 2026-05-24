# Budget Progress Charts

## Core Principle

No transaction-level accounting. Discretionary spending is tracked manually (spreadsheet → `value` fields in `budget.yaml`), and that's the only granularity we'll ever have. Charts work with totals and manually-entered actuals, not derived per-transaction figures.

---

## Layout

Chart 1 and Chart 2 sit side by side (half width each) below the existing Sankey:

```html
<canvas id="budgetIncomeSankeyChart"></canvas>
<div class="flex gap-4">
    <canvas id="budgetProgressChart"></canvas>
    <canvas id="budgetBaselineChart"></canvas>
</div>
```

---

## Chart 1: Progress Against Goals

### What it shows

A horizontal progress bar chart — one bar per tracked item — grouped into two sections:

- **savings** — actual YTD contributions by tax-treatment category vs. planned for the year, prorated to today
- **discretionary** — actual YTD spend per line item vs. budget, prorated to today

Each bar shows: spent (filled), remaining-to-target (outline), overrun past 100%. Overrun color differs by section: spending overrun uses `classified.chartWarn` (you overspent, notable but not catastrophic); savings overrun uses `classified.accent` (you saved more than planned — good news).

The target is prorated using a simple day-of-year fraction, making the chart actionable mid-year without snapping to pay periods.

### Prorating

```
prorated_target = annual_budget × (day_of_year / days_in_year)
progress_pct = actual_spent / prorated_target
```

For savings: actual comes from `savingsData` filtered to the budget year. For discretionary: actual is the `spent` (= `value`) field already in `budgetData[year].spending.sections.discretionary.items`.

If the budget year is not yet in `savingsData` (it's still projected), savings actual = 0 for each category — the bar is empty but the prorated target is shown.

### Data sources

**Savings — planned**: `budgetData[year].savings.by_category`
```js
{ "401(k)": 30918, "hsa": 8550, "roth ira": 29000, "taxable": 70000 }
```

**Savings — actual**: `savingsData`, filtered to budget year by category (same path-segment categorization as `computeBudgetSavings`).

**Discretionary — planned and actual**: `budgetData[year].spending.sections.discretionary.items`
```js
{ "honeymoon": { budget: 8000, spent: 4387 }, "alaska": { budget: 10000, spent: 7097 } }
```
`spent` here is manually entered in `budget.yaml` as `value` — it represents total spending on that item regardless of whether it went through credit card or cash.

### New data needed

None. Everything is already in `budgetData` and `savingsData`.

### Implementation notes

- New file: `web/js/chart-budgetProgress.js`, function `createBudgetProgressChart(canvasId, budgetData, savingsData, classified, today)`
- Chart type: horizontal bar (`bar` with `indexAxis: 'y'`)
- Visual separator or heading between savings and discretionary groups
- Colors: savings bars use `classified.accent`; savings overrun uses `classified.accent` (good news); discretionary bars use `classified.chart3`; discretionary overrun uses `classified.chartWarn`; prorated-remaining uses `classified.backgroundAlt`
- Labels: show `%` of prorated target at end of bar; tooltip shows dollar amounts (spent, prorated target, annual budget)

---

## Chart 2: Baseline Spending Tracker

### The problem

All credit card spending — baseline recurring (groceries, dining, subscriptions) and discretionary one-offs — flows through the same accounts. Some discretionary items may also be partially paid in cash (e.g. contractor checks for renovations). Transaction-level categorization is off the table.

The fundamental accounting identity:

```
total_spending = baseline_credit + baseline_cash + discretionary_credit + discretionary_cash
```

We know:
- `total_credit` from `credit.csv` — captures `baseline_credit + discretionary_credit`
- `total_discretionary` from manually tracked `value` fields — captures `discretionary_credit + discretionary_cash`
- `explicit_non_credit_baseline` — items like mortgage paid by ACH — must be manually tracked

The estimation gap is `discretionary_cash`: cash spending on discretionary items is included in `total_discretionary` (the user tracks it) but not in `total_credit` or `explicit_non_credit_baseline`. Subtracting discretionary from total would undercount baseline by that amount.

### Closing the gap with `cash_spending.csv`

In practice, true cash outflows (checks, Venmo, wire transfers for actual spending) are rare and typically large. The vast majority of cash movements are mechanical: income deposits, credit card bill payments, mortgage ACH, and inter-account transfers — none of which are spending.

A new `cash_spending.csv` file catalogs the occasional material cash spending transaction that would otherwise fall through the accounting. Small or infrequent omissions are acceptable; the goal is to keep the error well under 0.5% of total spending.

Same format as `credit.csv`: columns `date, account, value` with negative values for spending (e.g. `-8500` means $8,500 spent). The `account` field is a free-text label (e.g. `contractor — kitchen`, `venmo — ski trip`).

```csv
date,account,value
2026-03-15,contractor — kitchen renovation,-8500
2026-01-10,venmo — ski trip split,-340
```

This file lives in `data/cash_spending.csv`. Because the format matches `credit.csv`, it is loaded and parsed by the same `EventData` path in `dataLoader.js` — no new parser needed.

### Updated formula

```
total_actual = total_credit + explicit_non_credit_baseline + cash_spending_ytd
baseline_estimate = total_actual − total_discretionary_actual
```

Because `cash_spending.csv` captures the discretionary-cash items that `total_discretionary` accounts for but `total_credit` misses, the estimation closes cleanly — residual error is only from omitted small transactions.

### `budget.yaml` baseline schema change

Change the baseline section from a flat dict to an array (matching discretionary), adding optional `value` and `is_credit` flag:

```yaml
# Current (budget only, flat dict):
spending:
  baseline:
    credit_card: 90000
    mortgage: 31000

# Proposed (budget + actual, array):
spending:
  baseline:
    - name: credit card
      budget: 90000
      is_credit: true       # actual is computed from credit.csv YTD — no value field
    - name: mortgage
      budget: 31000
      value: 18000          # manually tracked YTD (ACH payments)
  discretionary:
    - name: renovations
      budget: 100000
      value: 47000          # total actual (credit + contractor cash combined)
    ...
```

The `credit card` baseline item is special: its actual comes from `credit.csv` total for the year, not a manual entry. All other non-`is_credit` baseline items need `value` entries updated periodically.

### Chart design

Grouped comparison: budget bar (outline) + actual bar (filled), one group per baseline category. Summary row at bottom:

```
credit card    [====budget====|  ]  $67k / $90k budget  (from credit.csv YTD)
mortgage       [======|           ]  $18k / $31k budget  (manual)
─────────────────────────────────────────────────────────
total baseline [====estimated====|  ]  $85k / $121k
```

The total baseline row uses the formula above (credit + non-credit baseline + cash_spending YTD − total discretionary actual). No qualifier needed — the estimate is now materially accurate.

### Computing credit YTD

A new helper sums credit spending from January through the current month of the budget year:

```js
function creditYTDForYear(creditMonthly, year) {
    return creditMonthly
        .filter(d => d.month.startsWith(year))
        .reduce((sum, d) => sum + Math.abs(d.value), 0);
}
```

`creditMonthly` is the same monthly array already used for `creditSpendingChart`.

### `computeBudgetSpending()` migration

Update to handle baseline as array (like discretionary) in addition to the current flat-dict form. Items come out with the same shape:

```js
items: {
  "credit card": { budget: 90000, spent: <credit_ytd>, is_credit: true },
  "mortgage":    { budget: 31000, spent: 18000 },
}
```

For backward compatibility during migration: if baseline is still a flat dict, treat each entry as `{ budget: value, spent: value }` (fully committed, no `is_credit`).

### New data loading

Add `cash_spending.csv` to `CONFIG.dataPaths` and load it in `dataLoader.js` as an `EventData` source. Compute `cashSpendingYTD` in `dashboard.js` by filtering to the budget year and summing `Math.abs(value)`.

### Implementation notes

- New file: `web/js/chart-budgetBaseline.js`, function `createBudgetBaselineChart(canvasId, baselineItems, totalBaselineEstimate, classified)`
- Colors: budget bar `classified.backgroundAlt`; actual bar `classified.chart2`; overrun `classified.chartWarn`
- If `value` is absent on a non-`is_credit` item: bar shows zero with a muted "not tracked" label in `textSubtle`
- Prorating: apply same day-of-year fraction to budget amounts for the reference target line

---

## New File: `data/cash_spending.csv`

**What goes here**: one-off checks or Venmo payments for discretionary items (e.g. paying a contractor for renovation work), rare large cash outflows with no other tracking home.

**What does NOT go here**: credit card bill payments (captured in `credit.csv`), mortgage and other recurring baseline items (captured as `budget.yaml` baseline items with `value` fields), transfers between own accounts (not spending), income deposits.

---

## Implementation Order

1. Add `cash_spending.csv` to `CONFIG.dataPaths` and load in `dataLoader.js`
2. Migrate `budget.yaml` baseline section to array format
3. Update `computeBudgetSpending()` to handle array baseline + `is_credit` flag
4. Build Chart 1 (progress) — no schema changes needed beyond what's already in `budgetData`
5. Build Chart 2 (baseline) — depends on steps 2–3
